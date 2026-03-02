import { test, expect } from "@playwright/test";

test.describe("Voting", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/submissions/1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            id: 1,
            title: "Test Submission",
            runtime: "llama.cpp",
            modelSlug: "meta-llama/Llama-3-8B",
            score: 10,
            userVote: null,
            createdAt: new Date().toISOString(),
          },
        }),
      });
    });
  });

  test("displays vote buttons on submission detail", async ({ page }) => {
    await page.goto("/submissions/1");

    await expect(page.getByRole("button", { name: /upvote/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /downvote/i })).toBeVisible();
  });

  test("upvotes a submission", async ({ page }) => {
    let voteCount = 10;

    await page.route("**/api/submissions/1/vote", async (route) => {
      if (route.request().method() === "POST") {
        voteCount += 1;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            score: voteCount,
            userVote: 1,
          }),
        });
      }
    });

    await page.goto("/submissions/1");

    const upvoteBtn = page.getByRole("button", { name: /upvote/i });
    await upvoteBtn.click();

    await expect(page.getByText("11")).toBeVisible();
  });

  test("downvotes a submission", async ({ page }) => {
    let voteCount = 10;

    await page.route("**/api/submissions/1/vote", async (route) => {
      if (route.request().method() === "POST") {
        voteCount -= 1;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            score: voteCount,
            userVote: -1,
          }),
        });
      }
    });

    await page.goto("/submissions/1");

    const downvoteBtn = page.getByRole("button", { name: /downvote/i });
    await downvoteBtn.click();

    await expect(page.getByText("9")).toBeVisible();
  });

  test("toggles vote off when clicking same button", async ({ page }) => {
    let userVote: number | null = 1;
    let score = 11;

    await page.route("**/api/submissions/1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            id: 1,
            title: "Test Submission",
            runtime: "llama.cpp",
            modelSlug: "meta-llama/Llama-3-8B",
            score,
            userVote,
            createdAt: new Date().toISOString(),
          },
        }),
      });
    });

    await page.route("**/api/submissions/1/vote", async (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        if (body?.value === 1 && userVote === 1) {
          userVote = null;
          score = 10;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            score,
            userVote,
          }),
        });
      }
    });

    await page.goto("/submissions/1");

    const upvoteBtn = page.getByRole("button", { name: /upvote/i });
    await upvoteBtn.click();

    await expect(page.getByText("10")).toBeVisible();
  });

  test("persists vote after page refresh", async ({ page }) => {
    await page.route("**/api/submissions/1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            id: 1,
            title: "Test Submission",
            runtime: "llama.cpp",
            modelSlug: "meta-llama/Llama-3-8B",
            score: 11,
            userVote: 1,
            createdAt: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto("/submissions/1");
    await page.reload();

    const upvoteBtn = page.getByRole("button", { name: /upvote/i });
    await expect(upvoteBtn).toHaveAttribute("data-voted", "true");
  });
});
