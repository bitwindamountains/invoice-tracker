import { test, expect } from "@playwright/test";
import { getDatabase } from "../../src/lib/db";

// Run with a demo-mode server (DEMO_MODE=true) and a LOCAL database: see docs/deployment-render-demo.md.
test.beforeAll(async () => {
  const host = new URL(process.env.DATABASE_URL ?? "postgresql://invalid").hostname;
  if (!["127.0.0.1", "localhost"].includes(host)) throw new Error("The demo e2e resets rate limits: it needs a local DATABASE_URL");
  // Locally every visitor shares one 3-per-hour demo bucket (TRUST_PROXY=false), so clear it.
  await getDatabase().rateLimit.deleteMany({ where: { OR: [{ key: { startsWith: "app:demo:" } }, { key: { startsWith: "app:demo-replace:" } }] } });
});

test("demo: start, send an invoice, get paid, start over, sign out", async ({ page, context }) => {
  test.setTimeout(180_000); // Routes compile on first visit in the dev server.
  const cookieValue = async () => (await context.cookies()).find((cookie) => cookie.name === "demo_session")?.value;

  await page.goto("/");
  await page.getByRole("button", { name: "Try the live demo" }).click();
  await expect(page).toHaveURL(/\/app$/, { timeout: 60_000 });
  await expect(page.getByText("Demo workspace")).toBeVisible();
  await expect(page.locator(".kpi-lead")).not.toContainText(/[₱$]\s*0\.00\s*$/);
  await expect(page.locator(".kpi-lead")).toContainText(/[1-9]/);

  await page.goto("/app/invoices/new");
  await page.getByRole("combobox", { name: "Client", exact: true }).selectOption({ label: "Maya Santos — Kapé Collective" });
  await page.getByLabel("Line 1 saved item").selectOption({ label: "Brand identity package" });
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page).toHaveURL(/\/app\/invoices\/(?!new)[^/]+$/, { timeout: 15_000 });
  const invoiceUrl = page.url();
  await page.getByRole("button", { name: "Send invoice" }).click();
  await page.getByRole("button", { name: "Issue and send" }).click();
  const publicLink = page.getByRole("link", { name: "Open public invoice" });
  await expect(publicLink).toBeVisible({ timeout: 15_000 });
  const invoiceNumber = (await page.locator("main h1").first().innerText()).trim();
  expect(invoiceNumber).toMatch(/\d/);
  const publicUrl = await publicLink.getAttribute("href");
  expect(publicUrl).toBeTruthy();
  const publicPage = await context.newPage();
  await publicPage.goto(publicUrl!);
  await expect(publicPage.getByText(invoiceNumber).first()).toBeVisible();
  await publicPage.close();

  await page.goto(invoiceUrl);
  await page.getByRole("button", { name: "Record payment" }).click();
  const dialog = page.getByRole("dialog", { name: "Record payment" });
  await dialog.getByLabel("Method").fill("Bank transfer");
  await dialog.getByRole("button", { name: "Record payment" }).click();
  await expect(page.locator(".detail-status").getByText("Paid", { exact: true })).toBeVisible({ timeout: 15_000 });

  // Start over: a fresh demo replaces the old one and the old cookie stops working.
  const first = await cookieValue();
  expect(first).toBeTruthy();
  await page.getByRole("button", { name: "Start over" }).click();
  await expect(page).toHaveURL(/\/app$/, { timeout: 60_000 });
  await expect(page.getByText("Demo workspace")).toBeVisible();
  const second = await cookieValue();
  expect(second).toBeTruthy();
  expect(second).not.toBe(first);
  const fresh = await context.newPage();
  await context.clearCookies();
  await context.addCookies([{ name: "demo_session", value: first!, url: page.url() }]);
  await fresh.goto("/app");
  await expect(fresh).toHaveURL(/\/$/);
  await fresh.close();

  // Sign out lands on the landing page and the saved cookie no longer works.
  await context.clearCookies();
  await context.addCookies([{ name: "demo_session", value: second!, url: page.url() }]);
  await page.goto("/app");
  await expect(page.getByText("Demo workspace")).toBeVisible();
  const saved = await cookieValue();
  // The dev-mode Next indicator overlaps the sidebar footer, so click without hit-testing.
  await page.getByRole("button", { name: "Sign out" }).first().dispatchEvent("click");
  await expect(page).toHaveURL(/\/$/);
  await context.addCookies([{ name: "demo_session", value: saved!, url: page.url() }]);
  await page.goto("/app");
  await expect(page).toHaveURL(/\/$/);
});
