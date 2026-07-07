"use client";

import { useEffect, useState } from "react";

type CategoryOption = {
  id: string;
  name: string;
  normalizedName: string;
};

type ProductFormState = {
  sku: string;
  name: string;
  description: string;
  selectedCategoryName: string;
  newCategoryName: string;
  price: string;
  stock: string;
  weight: string;
};

const initialState: ProductFormState = {
  sku: "",
  name: "",
  description: "",
  selectedCategoryName: "",
  newCategoryName: "",
  price: "",
  stock: "",
  weight: ""
};

export function ProductForm({ onSaved }: { onSaved?: () => void }) {
  const [form, setForm] = useState(initialState);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoryMode, setCategoryMode] = useState<"existing" | "new">("existing");
  const [priceUnit, setPriceUnit] = useState<"dollars" | "cents">("dollars");
  const [weightUnit, setWeightUnit] = useState<"grams" | "kg">("grams");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function loadCategories() {
    const response = await fetch("/api/categories");
    const data = await response.json();
    const items: CategoryOption[] = data.items ?? [];

    setCategories(items);
    if (!items.length) {
      setCategoryMode("new");
      return;
    }

    setForm((current) => ({
      ...current,
      selectedCategoryName: current.selectedCategoryName || items[0].name
    }));
  }

  useEffect(() => {
    void loadCategories();
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");

    const categoryName = categoryMode === "existing" ? form.selectedCategoryName : form.newCategoryName;
    const priceValue = Number(form.price);
    const weightValue = form.weight ? Number(form.weight) : null;
    const priceCents = priceUnit === "dollars" ? Math.round(priceValue * 100) : Math.round(priceValue);
    const weightGrams = weightValue === null ? null : weightUnit === "kg" ? Math.round(weightValue * 1000) : Math.round(weightValue);

    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku: form.sku,
        name: form.name,
        description: form.description,
        categoryName,
        priceCents,
        stock: Number(form.stock),
        weightGrams
      })
    });

    setIsSaving(false);

    if (!response.ok) {
      const data = await response.json();
      setMessage(data.error ?? "Could not save product");
      return;
    }

    setForm(initialState);
    setMessage("Product saved");
    await loadCategories();
    onSaved?.();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-md border border-[var(--border)] bg-white p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          SKU
          <input className="focus-ring rounded-md border border-[var(--border)] px-3 py-2" value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} required />
        </label>
        <label className="grid gap-1 text-sm">
          Name
          <input className="focus-ring rounded-md border border-[var(--border)] px-3 py-2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        </label>
      </div>

      <label className="grid gap-1 text-sm">
        Description
        <textarea className="focus-ring min-h-20 rounded-md border border-[var(--border)] px-3 py-2" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <fieldset className="grid gap-2">
          <legend className="text-sm">Category</legend>
          <div className="flex rounded-md border border-[var(--border)] bg-[var(--muted)] p-1 text-sm">
            <button className={`focus-ring flex-1 rounded px-3 py-2 ${categoryMode === "existing" ? "bg-white font-medium" : ""}`} type="button" onClick={() => setCategoryMode("existing")} disabled={!categories.length}>
              Existing
            </button>
            <button className={`focus-ring flex-1 rounded px-3 py-2 ${categoryMode === "new" ? "bg-white font-medium" : ""}`} type="button" onClick={() => setCategoryMode("new")}>
              New
            </button>
          </div>
          {categoryMode === "existing" ? (
            <select className="focus-ring rounded-md border border-[var(--border)] px-3 py-2" value={form.selectedCategoryName} onChange={(event) => setForm({ ...form, selectedCategoryName: event.target.value })} required>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          ) : (
            <input className="focus-ring rounded-md border border-[var(--border)] px-3 py-2" placeholder="New category name" value={form.newCategoryName} onChange={(event) => setForm({ ...form, newCategoryName: event.target.value })} required />
          )}
        </fieldset>

        <fieldset className="grid gap-2">
          <legend className="text-sm">Price</legend>
          <div className="flex rounded-md border border-[var(--border)] bg-[var(--muted)] p-1 text-sm">
            <button className={`focus-ring flex-1 rounded px-3 py-2 ${priceUnit === "dollars" ? "bg-white font-medium" : ""}`} type="button" onClick={() => setPriceUnit("dollars")}>
              Dollars
            </button>
            <button className={`focus-ring flex-1 rounded px-3 py-2 ${priceUnit === "cents" ? "bg-white font-medium" : ""}`} type="button" onClick={() => setPriceUnit("cents")}>
              Cents
            </button>
          </div>
          <input
            className="focus-ring rounded-md border border-[var(--border)] px-3 py-2"
            type="number"
            min="0"
            step={priceUnit === "dollars" ? "0.01" : "1"}
            placeholder={priceUnit === "dollars" ? "19.99" : "1999"}
            value={form.price}
            onChange={(event) => setForm({ ...form, price: event.target.value })}
            required
          />
        </fieldset>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          Stock
          <input className="focus-ring rounded-md border border-[var(--border)] px-3 py-2" type="number" min="0" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} required />
        </label>

        <fieldset className="grid gap-2">
          <legend className="text-sm">Weight</legend>
          <div className="flex rounded-md border border-[var(--border)] bg-[var(--muted)] p-1 text-sm">
            <button className={`focus-ring flex-1 rounded px-3 py-2 ${weightUnit === "grams" ? "bg-white font-medium" : ""}`} type="button" onClick={() => setWeightUnit("grams")}>
              Grams
            </button>
            <button className={`focus-ring flex-1 rounded px-3 py-2 ${weightUnit === "kg" ? "bg-white font-medium" : ""}`} type="button" onClick={() => setWeightUnit("kg")}>
              Kg
            </button>
          </div>
          <input
            className="focus-ring rounded-md border border-[var(--border)] px-3 py-2"
            type="number"
            min="0"
            step={weightUnit === "kg" ? "0.001" : "1"}
            placeholder={weightUnit === "kg" ? "0.5" : "500"}
            value={form.weight}
            onChange={(event) => setForm({ ...form, weight: event.target.value })}
          />
        </fieldset>
      </div>

      <div className="flex items-center gap-3">
        <button className="focus-ring rounded-md bg-[var(--accent)] px-4 py-2 font-medium text-[var(--accent-foreground)] disabled:opacity-60" disabled={isSaving}>
          {isSaving ? "Saving" : "Save product"}
        </button>
        {message ? <p className="text-sm text-[var(--muted-foreground)]">{message}</p> : null}
      </div>
    </form>
  );
}
