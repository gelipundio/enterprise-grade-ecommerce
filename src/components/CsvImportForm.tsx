"use client";

import { useState } from "react";

type ImportIssue = {
  rowNumber: number;
  field?: string;
  severity: "WARNING" | "ERROR";
  message: string;
};

type ImportResult = {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  issues: ImportIssue[];
};

export function CsvImportForm({ onImported }: { onImported?: () => void }) {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setIsUploading(true);
    setError("");
    setResult(null);

    const response = await fetch("/api/import", {
      method: "POST",
      body: formData
    });

    setIsUploading(false);

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Import failed");
      return;
    }

    const data = await response.json();
    setResult(data);
    onImported?.();
  }

  return (
    <section className="grid gap-3 rounded-md border border-[var(--border)] bg-white p-4">
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          CSV file
          <input className="focus-ring rounded-md border border-[var(--border)] bg-white px-3 py-2" name="file" type="file" accept=".csv,text/csv" required />
        </label>
        <button className="focus-ring rounded-md bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-60" disabled={isUploading}>
          {isUploading ? "Importing" : "Import CSV"}
        </button>
      </form>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {result ? (
        <div className="grid gap-3">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <strong>Created: {result.createdCount}</strong>
            <strong>Updated: {result.updatedCount}</strong>
            <strong>Skipped: {result.skippedCount}</strong>
          </div>
          {result.issues.length ? (
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="py-2">Row</th>
                  <th>Severity</th>
                  <th>Field</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {result.issues.map((issue, index) => (
                  <tr className="border-b border-[var(--border)]" key={`${issue.rowNumber}-${issue.message}-${index}`}>
                    <td className="py-2">{issue.rowNumber}</td>
                    <td>{issue.severity}</td>
                    <td>{issue.field ?? "-"}</td>
                    <td>{issue.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
