import "dotenv/config";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60000,
  expect: { timeout: 15_000 },
  workers: 1,
  use: {
    baseURL: process.env.APP_URL ?? "http://localhost:3000",
    headless: true,
  },
  reporter: "list",
});
