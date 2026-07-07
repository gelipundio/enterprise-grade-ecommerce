"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { clearCart, readCart, writeCart, type CartItems } from "@/lib/cart";
import { formatMoney } from "@/lib/format";

type CheckoutProduct = {
  id: string;
  sku: string;
  name: string;
  priceCents: number;
  stock: number;
};

export function CheckoutForm({ products }: { products: CheckoutProduct[] }) {
  const [quantities, setQuantities] = useState<CartItems>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setQuantities(readCart(window.localStorage));
    setIsLoaded(true);
  }, []);

  const cartProducts = useMemo(
    () =>
      products
        .filter((product) => (quantities[product.id] ?? 0) > 0)
        .map((product) => ({
          ...product,
          quantity: Math.min(product.stock, quantities[product.id] ?? 0)
        })),
    [products, quantities]
  );
  const totalCents = cartProducts.reduce((sum, product) => sum + product.priceCents * product.quantity, 0);

  function updateQuantity(product: CheckoutProduct, quantity: number) {
    const safeQuantity = Math.min(product.stock, Math.max(0, Math.round(quantity)));
    const next = { ...quantities };

    if (safeQuantity > 0) {
      next[product.id] = safeQuantity;
    } else {
      delete next[product.id];
    }

    setQuantities(next);
    writeCart(window.localStorage, next);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    const items = Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));

    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buyerName, buyerEmail, items })
    });

    setIsSubmitting(false);
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Checkout failed");
      return;
    }

    setMessage(`Order ${data.id} completed for ${formatMoney(data.totalCents)}`);
    setQuantities({});
    clearCart(window.localStorage);
  }

  if (isLoaded && !cartProducts.length) {
    return (
      <section className="grid gap-4 rounded-md border border-[var(--border)] bg-white p-4">
        <p className="text-[var(--muted-foreground)]">Your cart is empty.</p>
        <Link className="focus-ring w-fit rounded-md bg-[var(--accent)] px-4 py-2 font-medium text-white" href="/">
          Browse products
        </Link>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <div className="grid gap-3 rounded-md border border-[var(--border)] bg-white p-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          Name
          <input className="focus-ring rounded-md border border-[var(--border)] px-3 py-2" value={buyerName} onChange={(event) => setBuyerName(event.target.value)} required />
        </label>
        <label className="grid gap-1 text-sm">
          Email
          <input className="focus-ring rounded-md border border-[var(--border)] px-3 py-2" type="email" value={buyerEmail} onChange={(event) => setBuyerEmail(event.target.value)} required />
        </label>
      </div>
      <div className="grid gap-3">
        {cartProducts.map((product) => (
          <div className="grid gap-3 rounded-md border border-[var(--border)] bg-white p-4 md:grid-cols-[1fr_auto] md:items-center" key={product.id}>
            <div>
              <p className="font-semibold">{product.name}</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                {product.sku} · {formatMoney(product.priceCents)} · {product.stock} available · Line total {formatMoney(product.priceCents * product.quantity)}
              </p>
            </div>
            <label className="grid gap-1 text-sm">
              Quantity
              <input
                className="focus-ring w-28 rounded-md border border-[var(--border)] px-3 py-2"
                type="number"
                min="0"
                max={product.stock}
                value={product.quantity}
                onChange={(event) => updateQuantity(product, Number(event.target.value))}
              />
            </label>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <strong>Total: {formatMoney(totalCents)}</strong>
        <button className="focus-ring rounded-md bg-[var(--accent)] px-4 py-2 font-medium text-white disabled:opacity-60" disabled={isSubmitting || !cartProducts.length}>
          {isSubmitting ? "Processing" : "Complete fake purchase"}
        </button>
        {message ? <p className="text-sm text-[var(--muted-foreground)]">{message}</p> : null}
      </div>
    </form>
  );
}
