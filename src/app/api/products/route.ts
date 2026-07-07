import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { createProduct, listProducts } from "@/services/products";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "10");
  const products = await listProducts(getPrisma(), query, page, pageSize);

  return NextResponse.json(products);
}

export async function POST(request: Request) {
  try {
    const product = await createProduct(getPrisma(), await request.json());
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid product" }, { status: 400 });
  }
}
