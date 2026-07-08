import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { parseProductCsv } from "@/services/csv-import";
import { bulkUpsertImportedProducts } from "@/services/products";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "CSV file is required" }, { status: 400 });
  }

  const parsed = parseProductCsv(await file.text());
  const db = getPrisma();
  const { createdCount, updatedCount } = await bulkUpsertImportedProducts(db, parsed.products);

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
