import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";

if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator > 0) {
      const key = trimmed.slice(0, separator);
      const value = trimmed.slice(separator + 1).replace(/^["']|["']$/g, "");
      process.env[key] ??= value;
    }
  }
}

const prisma = new PrismaClient();

async function main() {
  const category = await prisma.category.upsert({
    where: { normalizedName: "starter" },
    update: {},
    create: { name: "Starter", normalizedName: "starter" }
  });

  await prisma.product.upsert({
    where: { sku: "STARTER-001" },
    update: {},
    create: {
      sku: "STARTER-001",
      name: "Starter Product",
      description: "Seed product for local smoke testing.",
      categoryId: category.id,
      priceCents: 1999,
      stock: 10,
      weightGrams: 500
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
