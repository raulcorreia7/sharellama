import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("loads and shows hero section", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator(".hero")).toBeVisible();
    await expect(page.locator(".hero-title")).toBeVisible();
    await expect(page.locator(".hero .text-gradient").getByText("ShareLlama")).toBeVisible();
    await expect(
      page.getByText("Share and discover optimal llama.cpp configurations"),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /browse configurations/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /submit your config/i }).first()).toBeVisible();
  });

  test("shows recent configurations section", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /recent configurations/i })).toBeVisible();
  });

  test("shows top rated section", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /top rated/i })).toBeVisible();
  });

  test("shows popular models section", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /popular models/i })).toBeVisible();
  });

  test("shows CTA banner", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText(/have a configuration to share/i)).toBeVisible();
  });

  test("navigates to submit page", async ({ page }) => {
    await page.goto("/");

    await page
      .getByRole("link", { name: /submit your config/i })
      .first()
      .click();

    await expect(page).toHaveURL("/submit");
  });

  test("navigates to browse page", async ({ page }) => {
    await page.goto("/");

    await page
      .getByRole("link", { name: /browse configurations/i })
      .first()
      .click();

    await expect(page).toHaveURL("/submissions");
  });
});

test.describe("Browse Submissions Page", () => {
  test("displays browse submissions page", async ({ page }) => {
    await page.goto("/submissions");

    await expect(page.getByRole("heading", { name: "Submissions" })).toBeVisible();
  });

  test("shows search input", async ({ page }) => {
    await page.goto("/submissions");

    await expect(page.getByPlaceholder(/search by title/i)).toBeVisible();
  });

  test("shows submit button", async ({ page }) => {
    await page.goto("/submissions");

    await expect(page.getByRole("link", { name: /submit/i }).first()).toBeVisible();
  });

  test("filters by model via URL", async ({ page }) => {
    await page.goto("/submissions?model=llama-3-8b");

    await expect(page).toHaveURL(/model=llama-3-8b/);
  });

  test("filters by GPU via URL", async ({ page }) => {
    await page.goto("/submissions?gpu=RTX%204090");

    await expect(page).toHaveURL(/gpu=/);
  });

  test("filters by runtime via URL", async ({ page }) => {
    await page.goto("/submissions?runtime=llama.cpp");

    await expect(page).toHaveURL(/runtime=llama.cpp/);
  });

  test("searches by query via URL", async ({ page }) => {
    await page.goto("/submissions?q=test");

    await expect(page).toHaveURL(/q=test/);
  });
});
