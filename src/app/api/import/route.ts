import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { parseProductCsv } from "@/services/csv-import";
import { normalizeSku, upsertImportedProduct } from "@/services/products";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "CSV file is required" }, { status: 400 });
  }

  const parsed = parseProductCsv(await file.text());
  const db = getPrisma();
  let createdCount = 0;
  let updatedCount = 0;

  for (const product of parsed.products) {
    const existing = await db.product.findUnique({
      where: { sku: normalizeSku(product.sku) },
      select: { id: true }
    });

    await upsertImportedProduct(db, {
      sku: product.sku,
      name: product.name,
      description: product.description,
      categoryName: product.categoryName,
      priceCents: product.priceCents,
      stock: product.stock,
      weightGrams: product.weightGrams
    });

    if (existing) {
      updatedCount += 1;
    } else {
      createdCount += 1;
    }
  }

  const importRun = await db.importRun.create({
    data: {
      fileName: file.name,
      createdCount,
      updatedCount,
      skippedCount: parsed.skippedCount,
      issueCount: parsed.issues.length,
      issues: {
        create: parsed.issues
      }
    },
    include: { issues: { orderBy: { rowNumber: "asc" } } }
  });

  return NextResponse.json({
    id: importRun.id,
    createdCount,
    updatedCount,
    skippedCount: parsed.skippedCount,
    issues: importRun.issues
  });
}
