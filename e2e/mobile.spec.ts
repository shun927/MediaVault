import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("protected app has no unintended horizontal overflow", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: "メニューを開く" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("mobile navigation supports keyboard and Escape", async ({ page }) => {
  await page.goto("/dashboard");
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
  const results = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  expect(results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
});
