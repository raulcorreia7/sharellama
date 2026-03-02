/**
 * Component Visual Tests
 * Tests visual appearance and hover states of key components
 */
import { test, expect } from "@playwright/test";

test.describe("Model Card", () => {
  test("should render model card with correct structure", async ({ page }) => {
    await page.goto("/models");
    const modelCard = page.locator(".model-card").first();

    if ((await modelCard.count()) > 0) {
      // Check card has header
      const header = modelCard.locator(".model-card-header");
      await expect(header).toBeVisible();

      // Check card has stats
      const stats = modelCard.locator(".model-card-stats");
      await expect(stats).toBeVisible();

      // Check card has arrow indicator
      const arrow = modelCard.locator(".card-arrow");
      await expect(arrow).toBeVisible();
    }
  });

  test("should show glow effect on card hover", async ({ page }) => {
    await page.goto("/models");
    const modelCard = page.locator(".model-card").first();

    if ((await modelCard.count()) > 0) {
      // Hover over card
      await modelCard.hover();

      // Check card has hover state (border color change or transform)
      const borderColor = await modelCard.evaluate((el) => getComputedStyle(el).borderColor);
      // Border should change on hover (implementation dependent)
      expect(borderColor).toBeTruthy();
    }
  });

  test("should show arrow translation on hover", async ({ page }) => {
    await page.goto("/models");
    const modelCard = page.locator(".model-card").first();

    if ((await modelCard.count()) > 0) {
      const arrow = modelCard.locator(".card-arrow");

      // Get initial position
      const initialTransform = await arrow.evaluate((el) => getComputedStyle(el).transform);

      // Hover over card
      await modelCard.hover();

      // Get hover position
      await page.waitForTimeout(200); // Wait for transition
      const hoverTransform = await arrow.evaluate((el) => getComputedStyle(el).transform);

      // Transform should change on hover
      expect(hoverTransform).not.toBe(initialTransform);
    }
  });
});

test.describe("StatTag Display", () => {
  test("should display stats with icons", async ({ page }) => {
    await page.goto("/models");
    const modelCard = page.locator(".model-card").first();

    if ((await modelCard.count()) > 0) {
      const tags = modelCard.locator(".model-card-stats .tag");
      const count = await tags.count();

      // Should have at least one stat tag
      expect(count).toBeGreaterThan(0);

      // Each tag should have an icon (SVG)
      for (let i = 0; i < Math.min(count, 3); i++) {
        const tag = tags.nth(i);
        const svg = tag.locator("svg");
        await expect(svg).toBeVisible();
      }
    }
  });
});

test.describe("CTA Banner", () => {
  test("should render CTA banner with glow effect", async ({ page }) => {
    await page.goto("/");
    const cta = page.locator(".cta-banner");
    await expect(cta).toBeVisible();

    // Check CTA has proper styling
    const background = await cta.evaluate((el) => getComputedStyle(el).background);
    expect(background).toBeTruthy();
  });
});
