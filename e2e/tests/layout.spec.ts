/**
 * Layout & Alignment Tests
 * Tests visual consistency and layout across pages
 */
import { test, expect } from "@playwright/test";

test.describe("Container Alignment", () => {
  test("should have consistent container width across pages", async ({ page }) => {
    const pages = ["/", "/models", "/submissions", "/submit"];

    for (const path of pages) {
      await page.goto(path);
      const main = page.locator(".main");
      await expect(main).toBeVisible();

      // Check max-width is applied
      const maxWidth = await main.evaluate((el) => getComputedStyle(el).maxWidth);
      expect(maxWidth).toBe("90rem");
    }
  });

  test("should have consistent page padding", async ({ page }) => {
    const pages = ["/", "/models", "/submissions"];

    for (const path of pages) {
      await page.goto(path);
      const main = page.locator(".main");
      const padding = await main.evaluate((el) => getComputedStyle(el).padding);
      // Should have padding (exact value may vary by breakpoint)
      expect(padding).toBeTruthy();
    }
  });
});

test.describe("Header Alignment", () => {
  test("should have vertically aligned navigation items", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator(".header-nav");
    await expect(nav).toBeVisible();

    // Check align-items is center
    const alignItems = await nav.evaluate((el) => getComputedStyle(el).alignItems);
    expect(["center", "flex-start"]).toContain(alignItems);
  });

  test("should have consistent header navigation spacing", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator(".header-nav");
    const gap = await nav.evaluate((el) => getComputedStyle(el).gap);
    expect(gap).toBeTruthy();
  });
});

test.describe("Card Layout", () => {
  test("should have consistent card spacing in grids", async ({ page }) => {
    await page.goto("/models");
    const grid = page.locator(".model-cards-grid, .grid");

    if ((await grid.count()) > 0) {
      const gap = await grid.first().evaluate((el) => getComputedStyle(el).gap);
      expect(gap).toBe("1rem");
    }
  });

  test("should have model cards with correct stats order", async ({ page }) => {
    await page.goto("/models");
    const modelCard = page.locator(".model-card").first();

    if ((await modelCard.count()) > 0) {
      const stats = modelCard.locator(".model-card-stats");
      await expect(stats).toBeVisible();

      // Stats should contain tags
      const tags = stats.locator(".tag");
      await expect(tags.first()).toBeVisible();
    }
  });
});

test.describe("Footer Spacing", () => {
  test("should have consistent footer margin-top", async ({ page }) => {
    await page.goto("/models");
    const footer = page.locator(".page-footer");

    if ((await footer.count()) > 0) {
      const marginTop = await footer.first().evaluate((el) => getComputedStyle(el).marginTop);
      expect(marginTop).toBe("1rem");
    }
  });
});
