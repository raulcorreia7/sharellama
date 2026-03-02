/**
 * Navigation Flow Tests
 * Tests core navigation paths and link functionality
 */
import { test, expect } from "@playwright/test";

test.describe("Header Navigation", () => {
  test("should navigate to Models page from header", async ({ page }) => {
    await page.goto("/");
    await page.click('a:has-text("Models")');
    await expect(page).toHaveURL("/models");
    await expect(page.locator("h1")).toContainText("Browse Models");
  });

  test("should navigate to Browse page from header", async ({ page }) => {
    await page.goto("/");
    await page.click('a:has-text("Browse")');
    await expect(page).toHaveURL("/submissions");
    await expect(page.locator("h1")).toContainText("Submissions");
  });

  test("should navigate to Submit page from header", async ({ page }) => {
    await page.goto("/");
    await page.click('button:has-text("Submit"), a:has-text("Submit")');
    await expect(page).toHaveURL("/submit");
    await expect(page.locator("h1")).toContainText("Submit");
  });
});

test.describe("Breadcrumbs", () => {
  test("should have correct breadcrumbs on Models page", async ({ page }) => {
    await page.goto("/models");
    const breadcrumbs = page.locator(".breadcrumbs");
    await expect(breadcrumbs).toContainText("Home");
    await expect(breadcrumbs).toContainText("Models");
  });

  test("should have correct breadcrumbs on Submissions page", async ({ page }) => {
    await page.goto("/submissions");
    const breadcrumbs = page.locator(".breadcrumbs");
    await expect(breadcrumbs).toContainText("Home");
    await expect(breadcrumbs).toContainText("Submissions");
  });
});

test.describe("Card Navigation", () => {
  test("should navigate to model detail when clicking model card", async ({ page }) => {
    await page.goto("/models");
    const modelCards = page.locator(".model-card");
    const count = await modelCards.count();

    if (count > 0) {
      await modelCards.first().click();
      await expect(page).toHaveURL(/\/models\/.+/);
    }
  });
});
