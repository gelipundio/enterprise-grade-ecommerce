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

export function CheckoutForm() {
  const [quantities, setQuantities] = useState<CartItems>({});
  const [products, setProducts] = useState<CheckoutProduct[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setQuantities(readCart(window.localStorage));
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    const productIds = Object.keys(quantities).filter((productId) => quantities[productId] > 0);

    if (!productIds.length) {
      setProducts([]);
      setIsSyncing(false);
      return;
    }

    const controller = new AbortController();

    async function syncProducts() {
      setIsSyncing(true);
      setMessage("");

      try {
        const response = await fetch(`/api/products?ids=${encodeURIComponent(productIds.join(","))}`, {
          signal: controller.signal
        });
        const data = (await response.json()) as { items?: CheckoutProduct[]; error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "Could not load cart products");
        }

        setProducts(data.items ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setProducts([]);
        setMessage(error instanceof Error ? error.message : "Could not load cart products");
      } finally {
        if (!controller.signal.aborted) {
          setIsSyncing(false);
        }
      }
    }

    syncProducts();

    return () => controller.abort();
  }, [isLoaded, quantities]);

  const cartProducts = useMemo(
    () =>
      products
        .map((product) => ({
          ...product,
          quantity: Math.min(product.stock, quantities[product.id] ?? 0)
        }))
        .filter((product) => product.quantity > 0),
    [products, quantities]
  );
  const unavailableProducts = useMemo(
    () => products.filter((product) => (quantities[product.id] ?? 0) > 0 && product.stock <= 0),
    [products, quantities]
  );
  const missingProductIds = useMemo(() => {
    const foundProductIds = new Set(products.map((product) => product.id));

    return Object.keys(quantities).filter((productId) => quantities[productId] > 0 && !foundProductIds.has(productId));
  }, [products, quantities]);
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

  function removeCartItem(productId: string) {
    const next = { ...quantities };
    delete next[productId];

    setQuantities(next);
    writeCart(window.localStorage, next);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    const items = cartProducts.map((product) => ({ productId: product.id, quantity: product.quantity }));

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

  if (isLoaded && !Object.values(quantities).some((quantity) => quantity > 0)) {
    return (
      <section className="grid gap-4 rounded-md border border-[var(--border)] bg-white p-4">
        <p className="text-[var(--muted-foreground)]">Your cart is empty.</p>
        <Link className="focus-ring w-fit rounded-md bg-[var(--accent)] px-4 py-2 font-medium text-white" href="/">
          Browse products
        </Link>
      </section>
    );
  }

  if (!isLoaded || isSyncing) {
    return (
      <section className="grid gap-4 rounded-md border border-[var(--border)] bg-white p-4">
        <p className="text-[var(--muted-foreground)]">Loading cart...</p>
      </section>
    );
  }

  if (!cartProducts.length && !unavailableProducts.length && !missingProductIds.length) {
    return (
      <section className="grid gap-4 rounded-md border border-[var(--border)] bg-white p-4">
        <p className="text-[var(--muted-foreground)]">{message || "No cart products are currently available."}</p>
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
        {unavailableProducts.map((product) => (
          <div className="grid gap-3 rounded-md border border-[var(--border)] bg-white p-4 md:grid-cols-[1fr_auto] md:items-center" key={product.id}>
            <div>
              <p className="font-semibold">{product.name}</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                {product.sku} · {formatMoney(product.priceCents)} · Out of stock · Requested {quantities[product.id]}
              </p>
            </div>
            <button className="focus-ring rounded-md border border-[var(--border)] px-3 py-2 text-sm" type="button" onClick={() => removeCartItem(product.id)}>
              Remove
            </button>
          </div>
        ))}
        {missingProductIds.map((productId) => (
          <div className="grid gap-3 rounded-md border border-[var(--border)] bg-white p-4 md:grid-cols-[1fr_auto] md:items-center" key={productId}>
            <div>
              <p className="font-semibold">Unavailable product</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Product {productId} could not be found · Requested {quantities[productId]}
              </p>
            </div>
            <button className="focus-ring rounded-md border border-[var(--border)] px-3 py-2 text-sm" type="button" onClick={() => removeCartItem(productId)}>
              Remove
            </button>
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
