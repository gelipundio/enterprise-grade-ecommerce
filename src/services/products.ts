import { randomUUID } from "crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import type { NormalizedImportProduct } from "@/services/csv-import";
import { containsUnsafeText, safeTextMessage } from "@/services/text-safety";

const requiredSafeText = (field: string, requiredMessage: string) =>
  z.string().trim().min(1, requiredMessage).refine((value) => !containsUnsafeText(value), safeTextMessage(field));
const safeOptionalText = (field: string) => z.string().trim().refine((value) => !containsUnsafeText(value), safeTextMessage(field)).optional().nullable();

export const productInputSchema = z.object({
  sku: requiredSafeText("SKU", "SKU is required"),
  name: requiredSafeText("Name", "Name is required"),
  description: safeOptionalText("Description"),
  categoryName: requiredSafeText("Category", "Category is required"),
  priceCents: z.coerce.number().int().min(0),
  stock: z.coerce.number().int().min(0),
  weightGrams: z.coerce.number().int().min(0).optional().nullable()
});

export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductWithCategory = Prisma.ProductGetPayload<{ include: { category: true } }>;

export type ProductClient = {
  category: {
    upsert(args: Prisma.CategoryUpsertArgs): Promise<{ id: string }>;
  };
  product: {
    create(args: Prisma.ProductCreateArgs): Promise<unknown>;
    update(args: Prisma.ProductUpdateArgs): Promise<unknown>;
    upsert(args: Prisma.ProductUpsertArgs): Promise<unknown>;
    findUnique(args: Prisma.ProductFindUniqueArgs): Promise<unknown>;
    count(args?: Prisma.ProductCountArgs): Promise<number>;
    findMany(args?: Prisma.ProductFindManyArgs): Promise<unknown[]>;
    delete(args: Prisma.ProductDeleteArgs): Promise<unknown>;
    deleteMany(args: Prisma.ProductDeleteManyArgs): Promise<{ count: number }>;
  };
};

export const productIdsSchema = z.object({
  ids: z.array(z.string().trim().min(1)).min(1, "At least one product id is required")
});

export function normalizeProductIds(ids: string[]) {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, 100);
}

export function normalizeSku(sku: string) {
  return sku.trim().toUpperCase();
}

export function categoryKey(categoryName: string) {
  return categoryName.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function createProduct(db: ProductClient, input: ProductInput) {
  const parsed = productInputSchema.parse(input);
  const category = await db.category.upsert({
    where: { normalizedName: categoryKey(parsed.categoryName) },
    update: { name: parsed.categoryName.trim() },
    create: {
      name: parsed.categoryName.trim(),
      normalizedName: categoryKey(parsed.categoryName)
    }
  });

  return db.product.create({
    data: {
      sku: normalizeSku(parsed.sku),
      name: parsed.name.trim(),
      description: parsed.description?.trim() || null,
      categoryId: category.id,
      priceCents: parsed.priceCents,
      stock: parsed.stock,
      weightGrams: parsed.weightGrams ?? null
    }
  });
}

export async function updateProduct(db: ProductClient, id: string, input: ProductInput) {
  const parsed = productInputSchema.parse(input);
  const category = await db.category.upsert({
    where: { normalizedName: categoryKey(parsed.categoryName) },
    update: { name: parsed.categoryName.trim() },
    create: {
      name: parsed.categoryName.trim(),
      normalizedName: categoryKey(parsed.categoryName)
    }
  });

  return db.product.update({
    where: { id },
    data: {
      sku: normalizeSku(parsed.sku),
      name: parsed.name.trim(),
      description: parsed.description?.trim() || null,
      categoryId: category.id,
      priceCents: parsed.priceCents,
      stock: parsed.stock,
      weightGrams: parsed.weightGrams ?? null
    }
  });
}

export async function upsertImportedProduct(db: ProductClient, input: ProductInput) {
  const parsed = productInputSchema.parse(input);
  const category = await db.category.upsert({
    where: { normalizedName: categoryKey(parsed.categoryName) },
    update: { name: parsed.categoryName.trim() },
    create: {
      name: parsed.categoryName.trim(),
      normalizedName: categoryKey(parsed.categoryName)
    }
  });

  return db.product.upsert({
    where: { sku: normalizeSku(parsed.sku) },
    create: {
      sku: normalizeSku(parsed.sku),
      name: parsed.name.trim(),
      description: parsed.description?.trim() || null,
      categoryId: category.id,
      priceCents: parsed.priceCents,
      stock: parsed.stock,
      weightGrams: parsed.weightGrams ?? null
    },
    update: {
      name: parsed.name.trim(),
      description: parsed.description?.trim() || null,
      categoryId: category.id,
      priceCents: parsed.priceCents,
      stock: parsed.stock,
      weightGrams: parsed.weightGrams ?? null
    }
  });
}

export async function bulkUpsertImportedProducts(db: PrismaClient, products: NormalizedImportProduct[]) {
  if (!products.length) {
    return { createdCount: 0, updatedCount: 0 };
  }

  const productsBySku = new Map<string, NormalizedImportProduct & { normalizedSku: string }>();

  for (const product of products) {
    productsBySku.set(normalizeSku(product.sku), {
      ...product,
      normalizedSku: normalizeSku(product.sku)
    });
  }

  const uniqueProducts = [...productsBySku.values()];
  const normalizedSkus = uniqueProducts.map((product) => product.normalizedSku);

  return db.$transaction(async (tx) => {
    const existingProducts = await tx.product.findMany({
      where: { sku: { in: normalizedSkus } },
      select: { sku: true }
    });
    const existingSkus = new Set(existingProducts.map((product) => product.sku));

    const categoriesByKey = new Map<string, { id: string; name: string; normalizedName: string }>();
    for (const product of uniqueProducts) {
      categoriesByKey.set(product.normalizedCategoryName, {
        id: randomUUID(),
        name: product.categoryName,
        normalizedName: product.normalizedCategoryName
      });
    }

    const categoryRows = [...categoriesByKey.values()];
    await tx.$executeRaw`
      INSERT INTO "Category" ("id", "name", "normalizedName", "createdAt", "updatedAt")
      VALUES ${Prisma.join(categoryRows.map((category) => Prisma.sql`(${category.id}, ${category.name}, ${category.normalizedName}, NOW(), NOW())`))}
      ON CONFLICT ("normalizedName") DO UPDATE SET
        "name" = EXCLUDED."name",
        "updatedAt" = NOW()
    `;

    const categories = await tx.category.findMany({
      where: { normalizedName: { in: categoryRows.map((category) => category.normalizedName) } },
      select: { id: true, normalizedName: true }
    });
    const categoryIdsByKey = new Map(categories.map((category) => [category.normalizedName, category.id]));

    await tx.$executeRaw`
      INSERT INTO "Product" ("id", "sku", "name", "description", "categoryId", "priceCents", "stock", "weightGrams", "createdAt", "updatedAt")
      VALUES ${Prisma.join(
        uniqueProducts.map((product) => {
          const categoryId = categoryIdsByKey.get(product.normalizedCategoryName);

          if (!categoryId) {
            throw new Error(`Category ${product.categoryName} was not found after bulk upsert`);
          }

          return Prisma.sql`(${randomUUID()}, ${product.normalizedSku}, ${product.name}, ${product.description ?? null}, ${categoryId}, ${product.priceCents}, ${product.stock}, ${product.weightGrams ?? null}, NOW(), NOW())`;
        })
      )}
      ON CONFLICT ("sku") DO UPDATE SET
        "name" = EXCLUDED."name",
        "description" = EXCLUDED."description",
        "categoryId" = EXCLUDED."categoryId",
        "priceCents" = EXCLUDED."priceCents",
        "stock" = EXCLUDED."stock",
        "weightGrams" = EXCLUDED."weightGrams",
        "updatedAt" = NOW()
    `;

    return {
      createdCount: uniqueProducts.filter((product) => !existingSkus.has(product.normalizedSku)).length,
      updatedCount: uniqueProducts.filter((product) => existingSkus.has(product.normalizedSku)).length
    };
  });
}

export function listProductsArgs(query: string, page: number, pageSize: number) {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(50, Math.max(1, pageSize));
  const where: Prisma.ProductWhereInput = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { sku: { contains: query, mode: "insensitive" } },
          { category: { name: { contains: query, mode: "insensitive" } } }
        ]
      }
    : {};

  return {
    where,
    skip: (safePage - 1) * safePageSize,
    take: safePageSize,
    orderBy: { updatedAt: "desc" as const },
    include: { category: true }
  };
}

export function listProductsByIdsArgs(ids: string[]) {
  const uniqueIds = normalizeProductIds(ids);

  return {
    where: { id: { in: uniqueIds } },
    orderBy: { name: "asc" as const },
    select: {
      id: true,
      sku: true,
      name: true,
      priceCents: true,
      stock: true
    }
  };
}

export async function deleteProducts(db: ProductClient, ids: string[]) {
  const uniqueIds = normalizeProductIds(ids);

  if (!uniqueIds.length) {
    return { count: 0 };
  }

  return db.product.deleteMany({
    where: { id: { in: uniqueIds } }
  });
}

export async function listProducts(db: ProductClient, query = "", page = 1, pageSize = 10) {
  const args = listProductsArgs(query.trim(), page, pageSize);
  const [items, total] = await Promise.all([
    db.product.findMany(args),
    db.product.count({ where: args.where })
  ]);

  return {
    items: items as ProductWithCategory[],
    total,
    page: Math.max(1, page),
    pageSize: Math.min(50, Math.max(1, pageSize)),
    pageCount: Math.max(1, Math.ceil(total / Math.min(50, Math.max(1, pageSize))))
  };
}
