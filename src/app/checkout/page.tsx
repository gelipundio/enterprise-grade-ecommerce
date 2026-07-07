import { CheckoutForm } from "@/components/CheckoutForm";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const products = await getPrisma().product.findMany({
    where: { stock: { gt: 0 } },
    orderBy: { name: "asc" },
    take: 50,
    select: {
      id: true,
      sku: true,
      name: true,
      priceCents: true,
      stock: true
    }
  });

  return (
    <main className="mx-auto grid max-w-4xl gap-8 px-4 py-8">
      <section className="grid gap-3">
        <h1 className="text-3xl font-semibold">Checkout</h1>
        <p className="text-[var(--muted-foreground)]">Create a fake paid order and decrement stock in one database transaction.</p>
      </section>
      <CheckoutForm products={products} />
    </main>
  );
}
