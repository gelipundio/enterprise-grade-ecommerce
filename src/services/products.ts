import { Prisma } from "@prisma/client";
import { z } from "zod";
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
  };
};

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
