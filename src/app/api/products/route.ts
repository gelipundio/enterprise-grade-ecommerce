import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { createProduct, deleteProducts, listProducts, listProductsByIdsArgs, productIdsSchema } from "@/services/products";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get("ids");

  if (ids) {
    const products = await getPrisma().product.findMany(listProductsByIdsArgs(ids.split(",")));
    return NextResponse.json({ items: products });
  }

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

export async function DELETE(request: Request) {
  try {
    const parsed = productIdsSchema.parse(await request.json());
    const result = await deleteProducts(getPrisma(), parsed.ids);

    return NextResponse.json({ deletedCount: result.count });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid product ids" }, { status: 400 });
  }
}
