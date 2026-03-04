/**
 * Smoke Tests
 * Basic functionality tests to ensure app is working
 */
import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("should load homepage successfully", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/ShareLlama/);
    await expect(page.locator("h1")).toContainText("ShareLlama");
  });

  test("should display main sections", async ({ page }) => {
    await page.goto("/");

    // Check for key sections
    await expect(page.locator("text=Recent Configurations")).toBeVisible();
    await expect(page.locator("text=Top Rated")).toBeVisible();
    await expect(page.locator("text=Trending")).toBeVisible();
  });
});

test.describe("Models Page", () => {
  test("should load models page successfully", async ({ page }) => {
    await page.goto("/models");
    await expect(page).toHaveTitle(/ShareLlama.*Models/);
    await expect(page.locator("h1")).toContainText("Browse Models");
  });

  test("should display model cards", async ({ page }) => {
    await page.goto("/models");
    const cards = page.locator(".model-card");

    // Should have at least one card or empty state
    const count = await cards.count();
    if (count === 0) {
      // Check for empty state
      await expect(page.locator("text=No models")).toBeVisible();
    }
  });

  test("should show loading transition when opening a model", async ({ page }) => {
    await page.goto("/models");

    const cards = page.locator(".model-card");
    const cardCount = await cards.count();
    test.skip(cardCount === 0, "No models available to validate model transition loading state.");

    const firstCard = cards.first();
    await expect(firstCard).toBeVisible();

    const navOverlay = page.locator(".global-nav-loading-overlay");
    await firstCard.click();

    await expect(navOverlay).toBeVisible({ timeout: 1500 });
    await expect(page).toHaveURL(/\/models\/.+/);
    await expect(page.locator(".model-detail-title")).toBeVisible();
  });
});

test.describe("Submissions Page", () => {
  test("should load submissions page successfully", async ({ page }) => {
    await page.goto("/submissions");
    await expect(page).toHaveTitle(/ShareLlama.*Submissions/);
    await expect(page.locator("h1")).toContainText("Submissions");
  });

  test("should display filters sidebar", async ({ page }) => {
    await page.goto("/submissions");
    const sidebar = page.locator("aside", { hasText: "Filters" });
    await expect(sidebar).toBeVisible();
  });
});

test.describe("Submit Page", () => {
  test("should load submit page successfully", async ({ page }) => {
    await page.goto("/submit");
    await expect(page).toHaveTitle(/ShareLlama.*Submit/);
    await expect(page.locator("h1")).toContainText("Submit");
  });

  test("should display submit form", async ({ page }) => {
    await page.goto("/submit");
    const form = page.locator("form");
    await expect(form).toBeVisible();
  });
});

test.describe("Responsive Layout", () => {
  test("should adapt to mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Mobile menu should be visible or navigation should adapt
    const header = page.locator(".header");
    await expect(header).toBeVisible();
  });

  test("should adapt to tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/models");

    const main = page.locator(".main");
    await expect(main).toBeVisible();
  });
});
