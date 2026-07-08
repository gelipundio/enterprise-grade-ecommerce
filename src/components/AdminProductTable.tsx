"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  priceCents: number;
  stock: number;
  category: { name: string };
};

export function AdminProductTable({ refreshKey = 0 }: { refreshKey?: number }) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const url = new URL("/api/products", window.location.origin);
    url.searchParams.set("pageSize", "50");
    if (query) {
      url.searchParams.set("query", query);
    }

    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        const items: ProductRow[] = data.items ?? [];
        setProducts(items);
        setSelectedIds((current) => {
          const visibleIds = new Set(items.map((product) => product.id));
          return new Set([...current].filter((id) => visibleIds.has(id)));
        });
      });
  }, [query, refreshKey]);

  async function remove(id: string) {
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    setProducts((current) => current.filter((product) => product.id !== id));
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAllVisible() {
    const visibleIds = products.map((product) => product.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of visibleIds) {
        if (allVisibleSelected) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }
      return next;
    });
  }

  async function removeSelected() {
    const ids = [...selectedIds];
    setIsDeleting(true);
    try {
      const response = await fetch("/api/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids })
      });

      if (response.ok) {
        const deletedIds = new Set(ids);
        setProducts((current) => current.filter((product) => !deletedIds.has(product.id)));
        setSelectedIds(new Set());
      }
    } finally {
      setIsDeleting(false);
    }
  }

  const allVisibleSelected = products.length > 0 && products.every((product) => selectedIds.has(product.id));
  const selectedCount = selectedIds.size;

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Products</h2>
        <div className="flex flex-1 justify-end gap-2">
          <button className="focus-ring rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--danger)] disabled:opacity-50" type="button" onClick={removeSelected} disabled={!selectedCount || isDeleting}>
            {isDeleting ? "Deleting" : `Delete selected${selectedCount ? ` (${selectedCount})` : ""}`}
          </button>
          <input className="focus-ring w-full max-w-sm rounded-md border border-[var(--border)] px-3 py-2" placeholder="Search admin products" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
      </div>
      <div className="overflow-x-auto rounded-md border border-[var(--border)] bg-white">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="bg-[var(--muted)]">
            <tr>
              <th className="w-12 p-3">
                <input className="focus-ring h-4 w-4" type="checkbox" aria-label="Select all visible products" checked={allVisibleSelected} onChange={toggleAllVisible} disabled={!products.length} />
              </th>
              <th className="p-3">SKU</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr className="border-t border-[var(--border)]" key={product.id}>
                <td className="p-3">
                  <input className="focus-ring h-4 w-4" type="checkbox" aria-label={`Select ${product.name}`} checked={selectedIds.has(product.id)} onChange={() => toggleSelected(product.id)} />
                </td>
                <td className="p-3 font-mono text-xs">{product.sku}</td>
                <td>{product.name}</td>
                <td>{product.category.name}</td>
                <td>{formatMoney(product.priceCents)}</td>
                <td>{product.stock}</td>
                <td>
                  <button className="focus-ring rounded-md border border-[var(--border)] px-3 py-1 text-sm text-[var(--danger)]" onClick={() => remove(product.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!products.length ? (
              <tr>
                <td className="p-3 text-[var(--muted-foreground)]" colSpan={7}>
                  No products found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
