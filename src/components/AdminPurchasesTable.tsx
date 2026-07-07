"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";

type PurchaseItem = {
  id: string;
  skuSnapshot: string;
  nameSnapshot: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
};

type Purchase = {
  id: string;
  buyerName: string;
  buyerEmail: string;
  status: string;
  totalCents: number;
  createdAt: string;
  items: PurchaseItem[];
};

export function AdminPurchasesTable() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders")
      .then((response) => response.json())
      .then((data) => setPurchases(data.items ?? []))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Purchases</h2>
        <span className="text-sm text-[var(--muted-foreground)]">{purchases.length} recent orders</span>
      </div>
      <div className="overflow-x-auto rounded-md border border-[var(--border)] bg-white">
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <thead className="bg-[var(--muted)]">
            <tr>
              <th className="p-3">Order</th>
              <th>Buyer</th>
              <th>Items</th>
              <th>Status</th>
              <th>Total</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((purchase) => (
              <tr className="border-t border-[var(--border)] align-top" key={purchase.id}>
                <td className="p-3 font-mono text-xs">{purchase.id}</td>
                <td>
                  <p className="font-medium">{purchase.buyerName}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{purchase.buyerEmail}</p>
                </td>
                <td>
                  <ul className="grid gap-1 py-2">
                    {purchase.items.map((item) => (
                      <li key={item.id}>
                        <span className="font-medium">{item.quantity}x</span> {item.nameSnapshot}{" "}
                        <span className="font-mono text-xs text-[var(--muted-foreground)]">({item.skuSnapshot})</span>{" "}
                        <span className="text-[var(--muted-foreground)]">{formatMoney(item.lineTotalCents)}</span>
                      </li>
                    ))}
                  </ul>
                </td>
                <td>{purchase.status.replace("_", " ")}</td>
                <td>{formatMoney(purchase.totalCents)}</td>
                <td>{new Date(purchase.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {!purchases.length ? (
              <tr>
                <td className="p-3 text-[var(--muted-foreground)]" colSpan={6}>
                  {isLoading ? "Loading purchases." : "No purchases found."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
