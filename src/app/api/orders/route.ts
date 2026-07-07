import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const take = Math.min(100, Math.max(1, Number(searchParams.get("take") ?? "50")));

  const orders = await getPrisma().order.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: {
      items: {
        orderBy: { skuSnapshot: "asc" }
      }
    }
  });

  return NextResponse.json({ items: orders });
}
