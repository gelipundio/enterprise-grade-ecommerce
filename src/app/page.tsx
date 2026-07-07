import Link from "next/link";
import { ProductCatalog } from "@/components/ProductCatalog";
import { getPrisma } from "@/lib/prisma";
import { listProducts } from "@/services/products";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ query?: string; page?: string }>;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = params.query ?? "";
  const page = Number(params.page ?? "1");
  const products = await listProducts(getPrisma(), query, page, 8);

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8">
      <section className="grid gap-3">
        <h1 className="text-4xl font-semibold">Product catalog</h1>
        <p className="max-w-3xl text-[var(--muted-foreground)]">
          Search products, review stock, and move to checkout for a fake paid order.
        </p>
        <form className="flex max-w-xl gap-2">
          <input className="focus-ring flex-1 rounded-md border border-[var(--border)] px-3 py-2" name="query" placeholder="Search by name, SKU, or category" defaultValue={query} />
          <button className="focus-ring rounded-md bg-[var(--accent)] px-4 py-2 font-medium text-white">Search</button>
        </form>
      </section>

      <ProductCatalog products={products.items} />

      {!products.items.length ? <p className="text-[var(--muted-foreground)]">No products found.</p> : null}

      <nav className="flex items-center justify-between">
        <Link className="rounded-md border border-[var(--border)] px-3 py-2 aria-disabled:pointer-events-none aria-disabled:opacity-50" aria-disabled={products.page <= 1} href={`/?query=${encodeURIComponent(query)}&page=${products.page - 1}`}>
          Previous
        </Link>
        <span className="text-sm text-[var(--muted-foreground)]">
          Page {products.page} of {products.pageCount}
        </span>
        <Link className="rounded-md border border-[var(--border)] px-3 py-2 aria-disabled:pointer-events-none aria-disabled:opacity-50" aria-disabled={products.page >= products.pageCount} href={`/?query=${encodeURIComponent(query)}&page=${products.page + 1}`}>
          Next
        </Link>
      </nav>
    </main>
  );
}
