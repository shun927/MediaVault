import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";

export default defineConfig(async () => ({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  plugins: [cloudflareTest({ main: "./tests/worker.ts", wrangler: { configPath: "./wrangler.jsonc" } })],
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["e2e/**"],
    provide: {
      d1Migrations: await readD1Migrations("./d1/migrations"),
    },
  },
}));
