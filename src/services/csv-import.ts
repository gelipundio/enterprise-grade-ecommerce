import Papa from "papaparse";
import { containsUnsafeText, safeTextMessage } from "@/services/text-safety";

export type ImportIssueSeverity = "WARNING" | "ERROR";

export type ImportIssueInput = {
  rowNumber: number;
  field?: string;
  severity: ImportIssueSeverity;
  message: string;
};

export type NormalizedImportProduct = {
  sku: string;
  name: string;
  description?: string;
  categoryName: string;
  normalizedCategoryName: string;
  priceCents: number;
  stock: number;
  weightGrams?: number;
};

export type ParsedImport = {
  products: NormalizedImportProduct[];
  issues: ImportIssueInput[];
  skippedCount: number;
};

type CsvRow = Record<string, unknown>;

const requiredFields = ["name", "sku", "category", "price", "stock"];
const safeTextFields = ["name", "sku", "category", "description"];

export function normalizeCategoryName(category: string) {
  return category.trim().replace(/\s+/g, " ").toLowerCase();
}

export function parsePriceCents(value: unknown) {
  const text = String(value ?? "").trim();

  if (!text) {
    return null;
  }

  if (text.toLowerCase() === "free") {
    return 0;
  }

  const cleaned = text.replace(/[$,\s]/g, "");
  const amount = Number(cleaned);

  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  return Math.round(amount * 100);
}

export function parseInteger(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) {
    return null;
  }

  const parsed = Number(text);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.round(parsed);
}

export function parseWeightGrams(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) {
    return undefined;
  }

  const kilograms = Number(text.replace(/,/g, ""));
  if (!Number.isFinite(kilograms) || kilograms < 0) {
    return null;
  }

  return Math.round(kilograms * 1000);
}

export function parseProductCsv(csvText: string): ParsedImport {
  const result = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim().toLowerCase()
  });

  const issues: ImportIssueInput[] = result.errors.map((error) => ({
    rowNumber: (error.row ?? 0) + 2,
    severity: "ERROR",
    message: error.message
  }));

  const products: NormalizedImportProduct[] = [];
  let skippedCount = 0;

  result.data.forEach((row, index) => {
    const rowNumber = index + 2;
    const rowIssues: ImportIssueInput[] = [];

    for (const field of requiredFields) {
      if (!String(row[field] ?? "").trim()) {
        rowIssues.push({
          rowNumber,
          field,
          severity: "ERROR",
          message: `${field} is required`
        });
      }
    }

    for (const field of safeTextFields) {
      if (containsUnsafeText(row[field])) {
        rowIssues.push({
          rowNumber,
          field,
          severity: "ERROR",
          message: safeTextMessage(field)
        });
      }
    }

    const priceCents = parsePriceCents(row.price);
    if (priceCents === null && String(row.price ?? "").trim()) {
      rowIssues.push({
        rowNumber,
        field: "price",
        severity: "ERROR",
        message: "price must be a number, a currency amount, or free"
      });
    }

    const parsedStock = parseInteger(row.stock);
    if (parsedStock === null && String(row.stock ?? "").trim()) {
      rowIssues.push({
        rowNumber,
        field: "stock",
        severity: "ERROR",
        message: "stock must be a number"
      });
    }

    const weightGrams = parseWeightGrams(row.weight_kg);
    if (weightGrams === null) {
      rowIssues.push({
        rowNumber,
        field: "weight_kg",
        severity: "WARNING",
        message: "weight_kg was ignored because it could not be parsed"
      });
    }

    const hasFatalIssue = rowIssues.some((issue) => issue.severity === "ERROR");
    issues.push(...rowIssues);

    if (hasFatalIssue || priceCents === null || parsedStock === null) {
      skippedCount += 1;
      return;
    }

    const categoryName = String(row.category).trim().replace(/\s+/g, " ");
    let stock = parsedStock;

    if (stock < 0) {
      stock = 0;
      issues.push({
        rowNumber,
        field: "stock",
        severity: "WARNING",
        message: "negative stock was clamped to 0"
      });
    }

    products.push({
      sku: String(row.sku).trim(),
      name: String(row.name).trim(),
      description: String(row.description ?? "").trim() || undefined,
      categoryName,
      normalizedCategoryName: normalizeCategoryName(categoryName),
      priceCents,
      stock,
      weightGrams: typeof weightGrams === "number" ? weightGrams : undefined
    });
  });

  return {
    products,
    issues,
    skippedCount
  };
}
