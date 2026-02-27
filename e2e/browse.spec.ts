import { test, expect } from "@playwright/test";

test.describe("Browse Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/submissions*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              id: 1,
              title: "Llama 3 8B on RTX 4090",
              runtime: "llama.cpp",
              modelName: "llama-3-8b",
              gpu: "RTX 4090",
              tokensPerSecond: 85.5,
              score: 42,
              createdAt: new Date().toISOString(),
            },
            {
              id: 2,
              title: "Mistral 7B on CPU",
              runtime: "llama.cpp",
              modelName: "mistral-7b",
              cpu: "Ryzen 9 7950X",
              tokensPerSecond: 12.3,
              score: 15,
              createdAt: new Date().toISOString(),
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            totalPages: 1,
          },
        }),
      });
    });
  });

  test("displays submissions list", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Llama 3 8B on RTX 4090")).toBeVisible();
    await expect(page.getByText("Mistral 7B on CPU")).toBeVisible();
  });

  test("displays submission details", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("RTX 4090")).toBeVisible();
    await expect(page.getByText("85.5")).toBeVisible();
    await expect(page.getByText("42")).toBeVisible();
  });

  test("navigates to submission detail on click", async ({ page }) => {
    await page.route("**/api/submissions/1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            id: 1,
            title: "Llama 3 8B on RTX 4090",
            runtime: "llama.cpp",
            modelName: "llama-3-8b",
            gpu: "RTX 4090",
            tokensPerSecond: 85.5,
            score: 42,
            description: "Detailed benchmark results",
            createdAt: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto("/");
    await page.getByText("Llama 3 8B on RTX 4090").click();

    await expect(page).toHaveURL(/\/submissions\/1/);
  });

  test("filters by search query", async ({ page }) => {
    await page.goto("/");

    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill("RTX");
      await page.keyboard.press("Enter");

      await expect(page.getByText("Llama 3 8B on RTX 4090")).toBeVisible();
    }
  });

  test("shows empty state when no submissions", async ({ page }) => {
    await page.route("**/api/submissions*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
          },
        }),
      });
    });

    await page.goto("/");

    await expect(page.getByText(/no submissions/i)).toBeVisible();
  });
});
