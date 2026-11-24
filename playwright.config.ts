import "dotenv/config";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  // The demo journey needs a demo-mode server; the foundation one needs real mode.
  testIgnore: process.env.DEMO_MODE === "true" ? "foundation.spec.ts" : "demo.spec.ts",
  timeout: 60000,
  expect: { timeout: 15_000 },
  workers: 1,
  use: {
    baseURL: process.env.APP_URL ?? "http://localhost:3000",
    headless: true,
  },
  reporter: "list",
});
