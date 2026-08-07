import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("protected pages have no unintended horizontal overflow", async ({ page }) => {
  for (const path of ["/dashboard", "/movies", "/books", "/music", "/search", "/timeline", "/settings"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "メニューを開く" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(1);
  }
});

test("mobile navigation supports keyboard, Escape, and authenticated API access", async ({ page }) => {
  await page.goto("/dashboard");
  const apiStatus = await page.evaluate(() => fetch("/api/me", { cache: "no-store" }).then((response) => response.status));
  expect(apiStatus).toBe(200);

  const menu = page.getByRole("button", { name: "メニューを開く" });
  await menu.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "メインメニュー" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "メインメニュー" })).toHaveAttribute("inert", "");
  await expect(menu).toBeFocused();
});

test("dashboard has no serious accessibility violations", async ({ page }) => {
  await page.goto("/dashboard");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
});

test("manual add works with keyboard-accessible rating", async ({ page }, testInfo) => {
  await page.goto("/search");
  await page.getByRole("button", { name: "手動で追加" }).click();
  const dialog = page.getByRole("dialog", { name: "作品を手動で追加" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("種類").selectOption("books");
  await dialog.getByLabel("タイトル").fill(`手動追加テスト-${testInfo.project.name}`);
  await dialog.getByLabel("年（任意）").fill("2026");
  await dialog.getByLabel("状態").selectOption("reading");
  const thirdStar = dialog.getByRole("radio", { name: "3つ星" });
  await thirdStar.focus();
  await page.keyboard.press("Enter");
  await expect(thirdStar).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByRole("radio", { name: "4つ星" })).toHaveAttribute("aria-checked", "true");
  await dialog.getByRole("button", { name: "追加する" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("コレクションに追加しました")).toBeVisible();
});

test("mobile timeline uses a vertical feed with only recorded months", async ({ page }, testInfo) => {
  test.skip((page.viewportSize()?.width || 0) > 640, "mobile layout only");
  const created = await page.request.post("/api/library", {
    data: {
      kind: "books",
      item: {
        title: `タイムラインテスト-${testInfo.project.name}`,
        google_books_id: null,
        cover_url: null,
        author: null,
        year: 2026,
        description: null,
        rating: 4,
        status: "reading",
        note: null,
        read_at: null,
      },
      tagIds: [],
      addHistory: false,
    },
  });
  expect(created.ok()).toBeTruthy();
  const payload = await created.json() as { data: { id: string } };
  const logged = await page.request.post(`/api/library/books/${payload.data.id}/history`, { data: {} });
  expect(logged.status()).toBe(201);

  await page.goto("/timeline");
  await expect(page.locator(".timeline-mobile-feed")).toBeVisible();
  await expect(page.locator(".timeline-canvas")).toBeHidden();
  await expect(page.locator(".timeline-mobile-feed").getByText(`タイムラインテスト-${testInfo.project.name}`, { exact: true }).first()).toBeVisible();
});

test("movie search surfaces upstream errors, empty results, and retry", async ({ page }) => {
  await page.goto("/search");
  const searchInput = page.getByPlaceholder("映画、アニメ、TVを検索…");
  await searchInput.fill("テスト作品");

  for (const status of [401, 429, 502]) {
    await page.route("**/api/search/movies?**", async (route) => {
      await route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ results: [], error: `検索エラー ${status}` }) });
    });
    await page.getByRole("button", { name: "検索", exact: true }).click();
    await expect(page.locator('div[role="alert"]').filter({ hasText: `検索エラー ${status}` })).toBeVisible();
    await expect(page.getByRole("button", { name: "再試行" })).toBeVisible();
    await page.unroute("**/api/search/movies?**");
  }

  await page.route("**/api/search/movies?**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ results: [] }) });
  });
  await page.getByRole("button", { name: "検索", exact: true }).click();
  await expect(page.locator('div[role="alert"]').filter({ hasText: "該当する映画・TVが見つかりませんでした" })).toBeVisible();
});
