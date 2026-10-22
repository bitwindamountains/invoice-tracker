import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getDatabase } from "../../src/lib/db";

test("public screens are accessible and fit desktop and mobile", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [1440, 768, 390, 360]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/",
      "/register",
      "/login",
      "/forgot-password",
      "/verify-email",
      "/reset-password",
    ]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      if (width === 390) {
        // Axe otherwise samples text colours mid-fade on the animated landing story.
        await page.evaluate(() =>
          Promise.all(
            document
              .getAnimations()
              .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
              .map((animation) => animation.finished.catch(() => undefined)),
          ),
        );
        const accessibility = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(accessibility.violations).toEqual([]);
      }
    }
  }
  await page.goto("/");
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().setOffline(true);
  // Playwright does not always apply offline emulation to an already running service worker, which then fetches
  // from the live server. Re-apply it before each retry until the worker serves the cached fallback.
  let attempt = 0;
  await expect(async () => {
    if (attempt++) {
      await page.context().setOffline(false);
      await page.context().setOffline(true);
    }
    await page.goto("/app");
    await expect(page.getByRole("heading", { name: "You're offline." })).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await page.screenshot({ path: "test-results/offline-mobile.png", fullPage: true });
  await page.context().setOffline(false);
  expect(errors).toEqual([]);
});

test("register, onboard, edit settings, logout and sign in through the browser", async ({
  page,
}) => {
  test.setTimeout(180_000); // Each route compiles on first visit in the dev server CI runs against.
  const email = `browser-${randomUUID()}@example.test`;
  const password = `Browser-${randomUUID()}`;
  const db = getDatabase();
  try {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login$/);
    await page.getByRole("link", { name: "Create an account" }).click();
    await page.waitForFunction(() =>
      [...document.querySelectorAll("button")].some((element) =>
        Object.keys(element).some((key) => key.startsWith("__react")),
      ),
    );
    await page.getByLabel("Full name").fill("Alex Example");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel(/^Password/).fill(password);
    await page.getByLabel("Confirm password").fill("mismatched-password");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Your passwords" }),
    ).toContainText("don’t match");
    await page.getByLabel("Confirm password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/onboarding$/, { timeout: 15_000 });
    await page.getByLabel("Business name").fill("Alex Design Studio");
    await page.getByLabel("Address line 1").fill("10 Example Street");
    await page.getByLabel("City").fill("Makati");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Make it feel like yours")).toBeVisible();
    await page.getByLabel("Website (optional)").fill("https://alex.example");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Set your invoice defaults")).toBeVisible();
    await page.getByLabel("Invoice prefix").fill("ADS-");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("How can clients pay you?")).toBeVisible();
    // Reaching the last step must not submit by itself: setup is saved only by Finish setup.
    await expect(page.getByRole("button", { name: "Finish setup" })).toBeEnabled();
    await page.getByRole("button", { name: "Finish setup" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Here’s what needs attention.",
      }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Clients", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Add your first client" })).toBeVisible();
    await page.getByRole("link", { name: "Create client" }).click();
    await page.getByLabel("Client name").fill("Brightside Labs");
    await page.getByLabel("Company (optional)").fill("Brightside Labs Ltd.");
    await page.getByLabel("Email").fill("accounts@brightside.test");
    await page.getByLabel("Phone (optional)").fill("+63 900 123 4567");
    await page.getByLabel("City (optional)").fill("Makati");
    await page.getByRole("button", { name: "Create client" }).click();
    await expect(page.getByRole("heading", { name: "Brightside Labs" })).toBeVisible();
    await page.getByRole("link", { name: "Edit client" }).click();
    await page.getByLabel("Company (optional)").fill("Brightside Creative Labs");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Brightside Creative Labs")).toBeVisible();
    await page.getByRole("button", { name: "Archive client" }).click();
    await page.getByRole("group", { name: "Archive client confirmation" }).getByRole("button", { name: "Archive client" }).click();
    await expect(page.getByText("Archived", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Restore client" }).click();
    await page.getByRole("group", { name: "Restore client confirmation" }).getByRole("button", { name: "Restore client" }).click();
    await expect(page.getByText("Active", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "All clients" }).click();
    await page.getByPlaceholder("Search name, company, email or phone").fill("Brightside");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.locator(".client-table").getByText("Brightside Creative Labs")).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({ path: "test-results/clients-mobile.png", fullPage: true });
    await page.getByRole("button", { name: "More" }).click();
    await page.getByRole("dialog", { name: "More navigation" }).getByRole("link", { name: "Catalog", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Create your first catalog item" })).toBeVisible();
    await page.getByRole("link", { name: "Create item" }).click();
    await page.getByLabel("Name").fill("Website Development");
    await page.getByLabel(/Default price/).fill("15000.00");
    await page.getByLabel("Unit").fill("project");
    await page.getByRole("button", { name: "Create item" }).click();
    await expect(page.getByRole("heading", { name: "Website Development" })).toBeVisible({ timeout: 10_000 });
    await page.getByRole("link", { name: "Edit item" }).click();
    await page.getByLabel("Name").fill("Website Design & Development");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("heading", { name: "Website Design & Development" })).toBeVisible();
    await page.getByRole("button", { name: "Archive item" }).click();
    await page.getByRole("group", { name: "Archive item confirmation" }).getByRole("button", { name: "Archive item" }).click();
    await expect(page.getByText("Archived", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Restore item" }).click();
    await page.getByRole("group", { name: "Restore item confirmation" }).getByRole("button", { name: "Restore item" }).click();
    await page.getByRole("link", { name: "All catalog items" }).click();
    await page.getByPlaceholder("Search name, description or unit").fill("Website");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.locator(".client-card").getByText("Website Design & Development")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: "test-results/catalog-mobile.png", fullPage: true });
    await page.getByRole("link", { name: "Invoices", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Create your first invoice" })).toBeVisible();
    await page.getByRole("link", { name: "Create invoice" }).click();
    await page.getByRole("combobox", { name: "Client", exact: true }).selectOption({ label: "Brightside Labs — Brightside Creative Labs" });
    await page.getByLabel("Line 1 saved item").selectOption({ label: "Website Design & Development" });
    await page.getByLabel("Line 1 discount type").selectOption("PERCENT");
    await page.getByLabel("Line 1 discount value").fill("10");
    await page.getByLabel("Line 1 tax rate").fill("12");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByRole("heading", { name: "ADS-1001" })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(".total-value")).toHaveText("₱15,120.00");
    await page.getByRole("link", { name: "Edit draft" }).click();
    await page.getByLabel("Line 1 quantity").fill("2");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page).toHaveURL(/\/app\/invoices\/[^/]+$/, { timeout: 10_000 });
    await expect(page.locator(".total-value")).toHaveText("₱30,240.00", { timeout: 10_000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: "test-results/invoice-preview-mobile.png", fullPage: true });
    const ownerInvoiceUrl = page.url();
    await page.getByRole("button", { name: "Send invoice" }).click();
    await expect(page.getByRole("dialog", { name: "Send invoice" })).toBeVisible();
    await page.getByRole("button", { name: "Issue and send" }).click();
    await expect(page.getByRole("status")).toContainText("Invoice sent", { timeout: 10_000 });
    const publicUrl = await page.getByRole("link", { name: "Open public invoice" }).getAttribute("href");
    expect(publicUrl).toBeTruthy();
    await page.goto(publicUrl!);
    await expect(page.getByText("Secure invoice link")).toBeVisible();
    await expect(page.locator(".total-value")).toHaveText("₱30,240.00");
    await expect(page.getByRole("link", { name: "Download PDF" })).toBeVisible();
    await page.screenshot({ path: "test-results/public-invoice-mobile.png", fullPage: true });
    await page.getByLabel("Payment method").fill("Bank transfer");
    await page.getByLabel("Reference number").fill("E2E-TRANSFER");
    await page.getByRole("button", { name: "Submit payment confirmation" }).click();
    await expect(page.getByRole("status")).toContainText("submitted for review");
    await page.goto("/app/payments");
    await expect(page.getByRole("heading", { name: "Review client confirmations." })).toBeVisible();
    await page.getByRole("button", { name: "Confirm payment" }).click();
    await expect(page.getByText("Your payment inbox is clear.")).toBeVisible();
    await page.goto(ownerInvoiceUrl);
    await expect(page.locator(".detail-status").getByText("Paid", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Payment history" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Download receipt" })).toBeVisible();
    await page.goto("/app");
    await expect(page.getByRole("heading", { name: "Here’s what needs attention." })).toBeVisible();
    await expect(page.getByText("Paid this month")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: "test-results/payment-dashboard-mobile.png", fullPage: true });
    await page.getByRole("link", { name: /View Get Paid/ }).click();
    await expect(page.getByRole("heading", { name: "Invoices that need a next step." })).toBeVisible();
    await page.screenshot({ path: "test-results/get-paid-mobile.png", fullPage: true });
    await page.goto("/app/reminders");
    await expect(page.getByRole("heading", { name: "Reminder sequence" })).toBeVisible();
    await expect(page.locator(".reminder-rule")).toHaveCount(5);
    await page.getByRole("button", { name: "Save sequence" }).click();
    await expect(page.getByRole("status")).toContainText("Sequence saved.");
    await page.screenshot({ path: "test-results/reminder-sequence-mobile.png", fullPage: true });
    await page.goto("/app/expenses");
    await expect(page.getByRole("heading", { name: "Track the cost of getting paid." })).toBeVisible();
    await page.getByRole("button", { name: "Record expense" }).click();
    await page.getByLabel("Vendor").fill("Cloud Host");
    await page.getByLabel("Description").fill("Monthly hosting");
    await page.getByLabel("Amount").fill("1500");
    await page.getByRole("button", { name: "Save expense" }).click();
    await expect(page.getByText("Cloud Host")).toBeVisible();
    await page.screenshot({ path: "test-results/expenses-mobile.png", fullPage: true });
    await page.goto("/app/reports");
    await expect(page.getByRole("heading", { name: "Revenue, costs, and receivables." })).toBeVisible();
    await expect(page.getByText("PHP 1,500.00").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Export CSV" })).toHaveCount(4);
    await page.screenshot({ path: "test-results/reports-mobile.png", fullPage: true });
    await page.goto(ownerInvoiceUrl);
    await expect(page.getByText("Invoice link opened")).toBeVisible();
    await expect(page.getByRole("link", { name: "Download PDF" })).toBeVisible();
    await page.getByRole("button", { name: "Create new public link" }).click();
    await expect(page.getByRole("link", { name: "Open new link" })).toBeVisible();
    await page.getByRole("button", { name: "Revoke link" }).click();
    await expect(page.getByRole("button", { name: "Create new public link" })).toBeVisible();
    await page.goto("/app/settings/business");
    await expect(page.getByLabel("Business name")).toHaveValue(
      "Alex Design Studio",
    );
    await page.screenshot({
      path: "test-results/business-settings-mobile.png",
      fullPage: true,
    });
    await page.goto("/app");
    await page.getByRole("button", { name: "More" }).click();
    await page.getByRole("dialog", { name: "More navigation" }).getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/app$/, { timeout: 15_000 });
  } finally {
    const user = await db.user.findUnique({ where: { email } });
    if (user) {
      const workspace = await db.workspace.findUnique({
        where: { ownerId: user.id },
      });
      if (workspace) {
        await db.expense.deleteMany({ where: { workspaceId: workspace.id } });
        await db.expenseCategory.deleteMany({ where: { workspaceId: workspace.id } });
        await db.invoiceReminder.deleteMany({ where: { workspaceId: workspace.id } });
        await db.reminderRule.deleteMany({ where: { workspaceId: workspace.id } });
        await db.payment.deleteMany({ where: { workspaceId: workspace.id } });
        await db.paymentConfirmation.deleteMany({ where: { workspaceId: workspace.id } });
        await db.paymentPromise.deleteMany({ where: { workspaceId: workspace.id } });
        await db.invoice.deleteMany({ where: { workspaceId: workspace.id } });
        await db.auditLog.deleteMany({ where: { workspaceId: workspace.id } });
        await db.workspace.delete({ where: { id: workspace.id } });
      }
      await db.user.delete({ where: { id: user.id } });
    }
    // Remove the test account from the shared Supabase Auth user list too.
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    ).auth.admin;
    const { data } = await admin.listUsers({ perPage: 1000 });
    const account = data?.users.find((candidate) => candidate.email === email);
    if (account) await admin.deleteUser(account.id);
    await db.$disconnect();
  }
});
