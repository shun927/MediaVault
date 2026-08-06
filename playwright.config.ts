import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: [["html", { open: "never" }]],
  use: { baseURL: "http://127.0.0.1:4173", trace: "retain-on-failure", extraHTTPHeaders: { "x-mediavault-dev-auth": "1" } },
  webServer: {
    command: "npm run db:migrate:local && npm run dev -- --port 4173",
    url: "http://127.0.0.1:4173/dashboard",
    reuseExistingServer: !process.env.CI,
    env: { DEV_AUTH_SUB: "e2e-user", DEV_AUTH_EMAIL: "e2e@example.com" },
    timeout: 120_000,
  },
  projects: [
    { name: "mobile-320", use: { ...devices["Desktop Chrome"], viewport: { width: 320, height: 568 } } },
    { name: "mobile-390", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
    { name: "landscape", use: { ...devices["Desktop Chrome"], viewport: { width: 844, height: 390 } } },
    { name: "tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } } },
  ],
});
