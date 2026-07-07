"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readCart, writeCart, type CartItems } from "@/lib/cart";
import { formatMoney, formatStock } from "@/lib/format";

type CatalogProduct = {
  id: string;
  sku: string;
  name: string;
  priceCents: number;
  stock: number;
  category: { name: string };
};

export function ProductCatalog({ products }: { products: CatalogProduct[] }) {
  const [cart, setCart] = useState<CartItems>({});

  useEffect(() => {
    setCart(readCart(window.localStorage));
  }, []);

  const cartCount = useMemo(() => Object.values(cart).reduce((sum, quantity) => sum + quantity, 0), [cart]);

  function updateCart(product: CatalogProduct, quantity: number) {
    const safeQuantity = Math.min(product.stock, Math.max(0, Math.round(quantity)));
    const next = { ...cart };

    if (safeQuantity > 0) {
      next[product.id] = safeQuantity;
    } else {
      delete next[product.id];
    }

    setCart(next);
    writeCart(window.localStorage, next);
  }

  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Products</h2>
        <Link className="focus-ring rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white" href="/checkout">
          Cart ({cartCount})
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => {
          const quantity = cart[product.id] ?? 0;

          return (
            <article className="grid gap-3 rounded-md border border-[var(--border)] bg-white p-4" key={product.id}>
              <div>
                <p className="font-mono text-xs text-[var(--muted-foreground)]">{product.sku}</p>
                <h3 className="text-lg font-semibold">{product.name}</h3>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">{product.category.name}</p>
              <div className="mt-auto flex items-center justify-between">
                <strong>{formatMoney(product.priceCents)}</strong>
                <span className="text-sm">{formatStock(product.stock)}</span>
              </div>
              <div className="grid gap-2">
                <label className="grid gap-1 text-sm">
                  Quantity
                  <input className="focus-ring rounded-md border border-[var(--border)] px-3 py-2" type="number" min="0" max={product.stock} value={quantity} onChange={(event) => updateCart(product, Number(event.target.value))} />
                </label>
                <button className="focus-ring rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50" type="button" onClick={() => updateCart(product, quantity || 1)} disabled={product.stock <= 0}>
                  {quantity ? "Update cart" : "Add to cart"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
