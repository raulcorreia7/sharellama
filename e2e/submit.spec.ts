import { test, expect } from "@playwright/test";

test.describe("Submit Page", () => {
  test("displays submit page with model search", async ({ page }) => {
    await page.goto("/submit");

    await expect(page.getByRole("heading", { name: /submit configuration/i })).toBeVisible();
    await expect(page.getByPlaceholder(/search models/i)).toBeVisible();
    await expect(page.getByLabel(/title/i)).toBeVisible();
  });

  test("shows quantization fields", async ({ page }) => {
    await page.goto("/submit");

    await expect(page.getByLabel(/quantization/i)).toBeVisible();
  });

  test("shows command input field", async ({ page }) => {
    await page.goto("/submit");

    await expect(page.getByPlaceholder(/paste your llama.cpp command/i)).toBeVisible();
  });

  test("allows filling title field", async ({ page }) => {
    await page.goto("/submit");

    const titleInput = page.getByLabel(/title/i);
    await titleInput.fill("Test Configuration");

    await expect(titleInput).toHaveValue("Test Configuration");
  });

  test("allows filling optional GPU field", async ({ page }) => {
    await page.goto("/submit");

    const gpuInput = page.getByLabel(/gpu/i);
    await gpuInput.fill("RTX 4090");

    await expect(gpuInput).toHaveValue("RTX 4090");
  });

  test("allows filling tokens per second field", async ({ page }) => {
    await page.goto("/submit");

    const tpsInput = page.getByLabel(/tokens\/sec/i);
    await tpsInput.fill("85.5");

    await expect(tpsInput).toHaveValue("85.5");
  });

  test("toggles advanced options", async ({ page }) => {
    await page.goto("/submit");

    const toggleBtn = page.getByRole("button", { name: /show all options/i });
    await toggleBtn.click();

    await expect(page.getByLabel(/cpu/i)).toBeVisible();
  });

  test("shows submit button", async ({ page }) => {
    await page.goto("/submit");

    await expect(page.getByRole("button", { name: /submit configuration/i })).toBeVisible();
  });
});
