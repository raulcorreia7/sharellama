import { test, expect, Page } from "@playwright/test";

test.describe("Submit Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/submit");
  });

  test("displays submit form", async ({ page }) => {
    await expect(page.getByLabel(/title/i)).toBeVisible();
    await expect(page.getByLabel(/runtime/i)).toBeVisible();
    await expect(page.getByLabel(/model name/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /submit/i })).toBeVisible();
  });

  test("validates required fields", async ({ page }) => {
    await page.getByRole("button", { name: /submit/i }).click();

    await expect(page.getByText(/title is required/i)).toBeVisible();
  });

  test("submits form successfully", async ({ page }) => {
    await page.route("**/api/submissions", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          submission: {
            id: 1,
            title: "Test Submission",
            runtime: "llama.cpp",
            modelName: "llama-3-8b",
            score: 0,
            createdAt: new Date().toISOString(),
          },
          adminLink: "http://localhost:3000/submissions/1/admin/test-token",
        }),
      });
    });

    await page.getByLabel(/title/i).fill("Test Submission");
    await page.getByLabel(/runtime/i).fill("llama.cpp");
    await page.getByLabel(/model name/i).fill("llama-3-8b");

    await page.getByRole("button", { name: /submit/i }).click();

    await expect(page).toHaveURL(/\/submissions\/1/);
  });

  test("shows admin link after submission", async ({ page }) => {
    await page.route("**/api/submissions", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          submission: {
            id: 1,
            title: "Test Submission",
            runtime: "llama.cpp",
            modelName: "llama-3-8b",
            score: 0,
            createdAt: new Date().toISOString(),
          },
          adminLink: "http://localhost:3000/submissions/1/admin/secret-token",
        }),
      });
    });

    await page.getByLabel(/title/i).fill("Test Submission");
    await page.getByLabel(/runtime/i).fill("llama.cpp");
    await page.getByLabel(/model name/i).fill("llama-3-8b");

    await page.getByRole("button", { name: /submit/i }).click();

    await expect(page.getByText(/admin link/i)).toBeVisible();
    await expect(page.getByText("secret-token")).toBeVisible();
  });

  test("allows adding optional fields", async ({ page }) => {
    await page.getByLabel(/gpu/i).fill("RTX 4090");
    await page.getByLabel(/cpu/i).fill("Ryzen 9 7950X");
    await page.getByLabel(/tokens per second/i).fill("45.5");

    await expect(page.getByLabel(/gpu/i)).toHaveValue("RTX 4090");
    await expect(page.getByLabel(/cpu/i)).toHaveValue("Ryzen 9 7950X");
    await expect(page.getByLabel(/tokens per second/i)).toHaveValue("45.5");
  });
});
