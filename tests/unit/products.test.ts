import { describe, expect, it } from "vitest";
import { categoryKey, listProductsArgs, normalizeSku, productInputSchema } from "@/services/products";

describe("product services", () => {
  it("normalizes SKU and category keys", () => {
    expect(normalizeSku(" abc-123 ")).toBe("ABC-123");
    expect(categoryKey("  Home   Goods ")).toBe("home goods");
  });

  it("validates product CRUD input", () => {
    const parsed = productInputSchema.parse({
      sku: "A-1",
      name: "Product",
      categoryName: "Tools",
      priceCents: "1234",
      stock: "5",
      weightGrams: ""
    });

    expect(parsed.priceCents).toBe(1234);
    expect(parsed.stock).toBe(5);
  });

  it("rejects potentially unsafe product text fields", () => {
    expect(() =>
      productInputSchema.parse({
        sku: "A-1",
        name: "<script>alert('xss')</script>",
        categoryName: "Tools",
        priceCents: "1234",
        stock: "5"
      })
    ).toThrow("Name contains potentially unsafe markup, script, or SQL control content");
  });

  it("rejects HTML tags in product text fields", () => {
    expect(() =>
      productInputSchema.parse({
        sku: "A-1",
        name: "<strong>Product</strong>",
        categoryName: "Tools",
        priceCents: "1234",
        stock: "5"
      })
    ).toThrow("Name contains potentially unsafe markup, script, or SQL control content");
  });

  it("rejects SQL-control payloads in product text fields", () => {
    expect(() =>
      productInputSchema.parse({
        sku: "A-1",
        name: "Robert'); DROP TABLE products;--",
        categoryName: "Tools",
        priceCents: "1234",
        stock: "5"
      })
    ).toThrow("Name contains potentially unsafe markup, script, or SQL control content");
  });

  it("builds search and pagination args", () => {
    const args = listProductsArgs("drill", 2, 5);

    expect(args.skip).toBe(5);
    expect(args.take).toBe(5);
    expect(args.where.OR).toHaveLength(3);
  });
});
