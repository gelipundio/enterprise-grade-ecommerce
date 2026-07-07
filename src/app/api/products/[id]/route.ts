import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { updateProduct } from "@/services/products";

type Params = Promise<{ id: string }>;

export async function PUT(request: Request, { params }: { params: Params }) {
  const { id } = await params;

  try {
    const product = await updateProduct(getPrisma(), id, await request.json());
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid product" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Params }) {
  const { id } = await params;
  await getPrisma().product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
