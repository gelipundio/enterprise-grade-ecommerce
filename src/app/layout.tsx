import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Enterprise E-Commerce Challenge",
  description: "Product import, management, search, and checkout challenge implementation."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-[var(--border)] bg-white">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-lg font-semibold">
              Commerce Core
            </Link>
            <div className="flex gap-2 text-sm">
              <Link className="rounded-md px-3 py-2 hover:bg-[var(--muted)]" href="/">
                Buyer
              </Link>
              <Link className="rounded-md px-3 py-2 hover:bg-[var(--muted)]" href="/checkout">
                Checkout
              </Link>
              <Link className="rounded-md px-3 py-2 hover:bg-[var(--muted)]" href="/admin">
                Admin
              </Link>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
