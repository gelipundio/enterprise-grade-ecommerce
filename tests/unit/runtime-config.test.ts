import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

function readProjectFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("runtime configuration", () => {
  it("uses fileURLToPath for Vitest aliases so paths with spaces work", () => {
    const config = readProjectFile("vitest.config.ts");

    expect(config).toContain('import { fileURLToPath } from "url"');
    expect(config).toContain('fileURLToPath(new URL("./src", import.meta.url))');
    expect(config).not.toContain(".pathname");
  });

  it("keeps a Prisma singleton across local HMR reloads", () => {
    const prisma = readProjectFile("src/lib/prisma.ts");

    expect(prisma).toContain("globalThis");
    expect(prisma).toContain("globalForPrisma.prisma");
    expect(prisma).toContain('process.env.NODE_ENV !== "production"');
  });

  it("defines a default Docker command for standalone image execution", () => {
    const dockerfile = readProjectFile("Dockerfile");

    expect(dockerfile).toContain('CMD ["pnpm", "start"]');
  });
});
