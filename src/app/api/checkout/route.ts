import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { checkout, InsufficientStockError, type CheckoutClient } from "@/services/checkout";

export async function POST(request: Request) {
  try {
    const order = await checkout(getPrisma() as unknown as CheckoutClient, await request.json());
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : "Checkout failed" }, { status: 400 });
  }
}
