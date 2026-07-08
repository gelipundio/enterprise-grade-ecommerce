import { describe, expect, it } from "vitest";
import { parseProductCsv, parsePriceCents, parseWeightGrams } from "@/services/csv-import";

describe("CSV import normalization", () => {
  it("parses safe currency formatting and free prices", () => {
    expect(parsePriceCents("$29.99")).toBe(2999);
    expect(parsePriceCents("free")).toBe(0);
  });

  it("converts kilograms to rounded grams", () => {
    expect(parseWeightGrams("1.25")).toBe(1250);
    expect(parseWeightGrams("0.3336")).toBe(334);
  });

  it("skips rows missing required fields and imports valid rows", () => {
    const csv = "name,sku,category,price,stock\nWidget,W-1,Tools,$29.99,3\n,BAD,Tools,10,1\n";
    const result = parseProductCsv(csv);

    expect(result.products).toHaveLength(1);
    expect(result.skippedCount).toBe(1);
    expect(result.issues).toContainEqual(expect.objectContaining({ rowNumber: 3, field: "name", severity: "ERROR" }));
  });

  it("clamps negative stock and reports a warning", () => {
    const csv = "name,sku,category,price,stock\nWidget,W-1,Tools,10,-4\n";
    const result = parseProductCsv(csv);

    expect(result.products[0]?.stock).toBe(0);
    expect(result.issues).toContainEqual(expect.objectContaining({ field: "stock", severity: "WARNING" }));
  });

  it("reports unparseable required values", () => {
    const csv = "name,sku,category,price,stock\nWidget,W-1,Tools,nope,many\n";
    const result = parseProductCsv(csv);

    expect(result.products).toHaveLength(0);
    expect(result.skippedCount).toBe(1);
    expect(result.issues.filter((issue) => issue.severity === "ERROR")).toHaveLength(2);
  });

  it("skips rows with potentially unsafe script content", () => {
    const csv = "name,sku,category,description,price,stock\nWidget,W-1,Tools,<script>alert('xss')</script>,10,2\n";
    const result = parseProductCsv(csv);

    expect(result.products).toHaveLength(0);
    expect(result.skippedCount).toBe(1);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rowNumber: 2,
        field: "description",
        severity: "ERROR",
        message: "description contains potentially unsafe markup or script content"
      })
    );
  });

  it("skips rows with HTML tags in product text", () => {
    const csv = "name,sku,category,description,price,stock\n<strong>Widget</strong>,W-1,Tools,Plain,10,2\n";
    const result = parseProductCsv(csv);

    expect(result.products).toHaveLength(0);
    expect(result.skippedCount).toBe(1);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rowNumber: 2,
        field: "name",
        severity: "ERROR"
      })
    );
  });

  it("allows SQL keywords in product text", () => {
    const csv = "name,sku,category,description,price,stock\nRobert'); DROP TABLE products;-- display stand,W-1,Tools,Plain,10,2\n";
    const result = parseProductCsv(csv);

    expect(result.products).toHaveLength(1);
    expect(result.products[0]?.name).toBe("Robert'); DROP TABLE products;-- display stand");
    expect(result.skippedCount).toBe(0);
  });
});
