import { expect, test } from "@playwright/test";

test("buyer catalog and admin pages render", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Product catalog" })).toBeVisible();

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Import csv" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create product" })).toBeVisible();
  await page.getByRole("button", { name: "Create product" }).click();
  await expect(page.getByRole("button", { name: "Save product" })).toBeVisible();
  await page.getByRole("button", { name: "Purchases" }).click();
  await expect(page.getByRole("heading", { name: "Purchases" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save product" })).toHaveCount(0);
});

test("buyer can add a product to cart and see it at checkout", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
  await expect(page.getByText("Your cart is empty.")).toBeVisible();

  await page.goto("/");
  await page.getByRole("button", { name: "Add to cart" }).first().click();

  await page.goto("/checkout");
  await expect(page.getByRole("button", { name: "Complete fake purchase" })).toBeVisible();
  await expect(page.getByText("Total:")).toBeVisible();
});
