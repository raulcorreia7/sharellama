import { test, expect } from "@playwright/test";

test.describe("Model Detail Page", () => {
  test("loads model detail page route", async ({ page }) => {
    const response = await page.goto("/models/meta-llama/llama-3-8b");

    expect(response?.status()).toBe(200);
  });

  test("shows page content", async ({ page }) => {
    await page.goto("/models/meta-llama/llama-3-8b");

    await expect(page.locator("body")).toBeVisible();
  });

  test("page title contains model info", async ({ page }) => {
    await page.goto("/models/meta-llama/llama-3-8b");

    const title = await page.title();
    expect(title).toContain("ShareLlama");
  });
});
