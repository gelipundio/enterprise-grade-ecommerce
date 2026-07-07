"use client";

import { useState } from "react";
import { AdminProductTable } from "./AdminProductTable";
import { AdminPurchasesTable } from "./AdminPurchasesTable";
import { CsvImportForm } from "./CsvImportForm";
import { ProductForm } from "./ProductForm";

export function AdminWorkspace() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<"products" | "purchases">("products");
  const [activeProductAction, setActiveProductAction] = useState<"none" | "import" | "create">("none");
  const refresh = () => setRefreshKey((value) => value + 1);

  return (
    <div className="grid gap-8">
      <section className="grid gap-3">
        <h1 className="text-3xl font-semibold">Admin</h1>
        <p className="max-w-3xl text-[var(--muted-foreground)]">
          Manage the product catalog and import CSV rows with row-level reporting.
        </p>
      </section>

      <div className="flex rounded-md border border-[var(--border)] bg-[var(--muted)] p-1 text-sm">
        <button className={`focus-ring flex-1 rounded px-3 py-2 ${activeTab === "products" ? "bg-white font-medium" : ""}`} type="button" onClick={() => setActiveTab("products")}>
          Products
        </button>
        <button className={`focus-ring flex-1 rounded px-3 py-2 ${activeTab === "purchases" ? "bg-white font-medium" : ""}`} type="button" onClick={() => setActiveTab("purchases")}>
          Purchases
        </button>
      </div>

      {activeTab === "products" ? (
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              className={`focus-ring rounded-md px-4 py-2 text-sm font-medium ${activeProductAction === "import" ? "bg-slate-900 text-white" : "border border-[var(--border)] bg-white"}`}
              type="button"
              onClick={() => setActiveProductAction((current) => (current === "import" ? "none" : "import"))}
            >
              Import csv
            </button>
            <button
              className={`focus-ring rounded-md px-4 py-2 text-sm font-medium ${activeProductAction === "create" ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] bg-white"}`}
              type="button"
              onClick={() => setActiveProductAction((current) => (current === "create" ? "none" : "create"))}
            >
              Create product
            </button>
          </div>
          {activeProductAction === "import" ? <CsvImportForm onImported={refresh} /> : null}
          {activeProductAction === "create" ? <ProductForm onSaved={refresh} /> : null}
          <AdminProductTable refreshKey={refreshKey} />
        </div>
      ) : (
        <AdminPurchasesTable />
      )}
    </div>
  );
}
