import { describe, expect, it } from "vitest";
import { checkout, InsufficientStockError, type CheckoutClient } from "@/services/checkout";

function createCheckoutClient(stock: number): CheckoutClient & { updatedStock: number; orderCreated: boolean } {
  const state = {
    updatedStock: stock,
    orderCreated: false,
    product: {
      async findMany() {
        return [{ id: "p1", sku: "SKU-1", name: "Product", priceCents: 500, stock: state.updatedStock }];
      },
      async update(args: { data: { stock: { decrement: number } } }) {
        state.updatedStock -= args.data.stock.decrement;
        return {};
      }
    },
    order: {
      async create() {
        state.orderCreated = true;
        return { id: "o1", totalCents: 1000, items: [] };
      }
    },
    async $transaction<T>(callback: (tx: CheckoutClient) => Promise<T>) {
      return callback(state);
    }
  };

  return state;
}

describe("checkout service", () => {
  it("creates an order and decrements stock atomically", async () => {
    const client = createCheckoutClient(3);
    const order = await checkout(client, {
      buyerName: "Buyer",
      buyerEmail: "buyer@example.com",
      items: [{ productId: "p1", quantity: 2 }]
    });

    expect(order).toEqual(expect.objectContaining({ id: "o1", totalCents: 1000 }));
    expect(client.updatedStock).toBe(1);
    expect(client.orderCreated).toBe(true);
  });

  it("rejects insufficient stock before creating an order", async () => {
    const client = createCheckoutClient(1);

    await expect(
      checkout(client, {
        buyerName: "Buyer",
        buyerEmail: "buyer@example.com",
        items: [{ productId: "p1", quantity: 2 }]
      })
    ).rejects.toBeInstanceOf(InsufficientStockError);
    expect(client.orderCreated).toBe(false);
    expect(client.updatedStock).toBe(1);
  });
});
