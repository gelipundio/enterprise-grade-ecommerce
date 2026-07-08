import { describe, expect, it } from "vitest";
import { categoryKey, deleteProducts, listProductsArgs, listProductsByIdsArgs, normalizeProductIds, normalizeSku, productInputSchema, type ProductClient } from "@/services/products";

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
    ).toThrow("Name contains potentially unsafe markup or script content");
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
    ).toThrow("Name contains potentially unsafe markup or script content");
  });

  it("allows SQL keywords in product text because Prisma parameterizes queries", () => {
    const parsed = productInputSchema.parse({
      sku: "A-1",
      name: "Robert'); DROP TABLE products;-- display stand",
      description: "A sturdy table for product displays",
      categoryName: "Tools",
      priceCents: "1234",
      stock: "5"
    });

    expect(parsed.name).toBe("Robert'); DROP TABLE products;-- display stand");
  });

  it("builds search and pagination args", () => {
    const args = listProductsArgs("drill", 2, 5);

    expect(args.skip).toBe(5);
    expect(args.take).toBe(5);
    expect(args.where.OR).toHaveLength(3);
  });

  it("builds cart product lookup args from specific IDs", () => {
    const args = listProductsByIdsArgs([" p2 ", "p1", "p2", ""]);

    expect(args.where.id.in).toEqual(["p2", "p1"]);
    expect(args.select).toEqual({
      id: true,
      sku: true,
      name: true,
      priceCents: true,
      stock: true
    });
  });

  it("normalizes product IDs for batch operations", () => {
    expect(normalizeProductIds([" p2 ", "p1", "p2", ""])).toEqual(["p2", "p1"]);
  });

  it("deletes products in one batch operation with normalized IDs", async () => {
    let receivedIds: string[] = [];
    const client = {
      product: {
        async deleteMany(args: { where: { id: { in: string[] } } }) {
          receivedIds = args.where.id.in;
          return { count: receivedIds.length };
        }
      }
    } as unknown as ProductClient;

    const result = await deleteProducts(client, [" p2 ", "p1", "p2", ""]);

    expect(receivedIds).toEqual(["p2", "p1"]);
    expect(result.count).toBe(2);
  });
});
