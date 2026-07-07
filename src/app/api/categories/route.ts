import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  const categories = await getPrisma().category.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      normalizedName: true
    }
  });

  return NextResponse.json({ items: categories });
}
