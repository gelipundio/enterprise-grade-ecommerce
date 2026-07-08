import { z } from "zod";

export const checkoutSchema = z.object({
  buyerName: z.string().trim().min(1, "Buyer name is required"),
  buyerEmail: z.string().trim().email("Buyer email is invalid"),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().positive()
      })
    )
    .min(1, "At least one product is required")
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

type CheckoutProduct = {
  id: string;
  sku: string;
  name: string;
  priceCents: number;
  stock: number;
};

export type CheckoutClient = {
  product: {
    findMany(args: { where: { id: { in: string[] } } }): Promise<CheckoutProduct[]>;
    updateMany(args: { where: { id: string; stock: { gte: number } }; data: { stock: { decrement: number } } }): Promise<{ count: number }>;
  };
  order: {
    create(args: {
      data: {
        buyerName: string;
        buyerEmail: string;
        totalCents: number;
        items: {
          create: Array<{
            productId: string;
            skuSnapshot: string;
            nameSnapshot: string;
            unitPriceCents: number;
            quantity: number;
            lineTotalCents: number;
          }>;
        };
      };
      include: { items: true };
    }): Promise<unknown>;
  };
  $transaction<T>(callback: (tx: CheckoutClient) => Promise<T>): Promise<T>;
};

export class InsufficientStockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsufficientStockError";
  }
}

export async function checkout(db: CheckoutClient, input: CheckoutInput) {
  const parsed = checkoutSchema.parse(input);

  return db.$transaction(async (tx) => {
    const productIds = parsed.items.map((item) => item.productId);
    const products = await tx.product.findMany({
      where: { id: { in: productIds } }
    });
    const productsById = new Map(products.map((product) => [product.id, product]));

    const orderItems = parsed.items.map((item) => {
      const product = productsById.get(item.productId);

      if (!product) {
        throw new InsufficientStockError(`Product ${item.productId} was not found`);
      }

      if (product.stock < item.quantity) {
        throw new InsufficientStockError(`${product.name} has only ${product.stock} in stock`);
      }

      return {
        productId: product.id,
        skuSnapshot: product.sku,
        nameSnapshot: product.name,
        unitPriceCents: product.priceCents,
        quantity: item.quantity,
        lineTotalCents: product.priceCents * item.quantity
      };
    });

    const totalCents = orderItems.reduce((sum, item) => sum + item.lineTotalCents, 0);

    for (const item of parsed.items) {
      const result = await tx.product.updateMany({
        where: {
          id: item.productId,
          stock: { gte: item.quantity }
        },
        data: { stock: { decrement: item.quantity } }
      });

      if (result.count !== 1) {
        const product = productsById.get(item.productId);
        throw new InsufficientStockError(product ? `${product.name} no longer has enough stock` : `Product ${item.productId} was not found`);
      }
    }

    const order = await tx.order.create({
      data: {
        buyerName: parsed.buyerName.trim(),
        buyerEmail: parsed.buyerEmail.trim(),
        totalCents,
        items: { create: orderItems }
      },
      include: { items: true }
    });

    return order;
  });
}
