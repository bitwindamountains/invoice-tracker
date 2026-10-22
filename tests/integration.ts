import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { Prisma } from "../src/generated/prisma/client";
import { getDatabase } from "../src/lib/db";
import {
  authorizeWorkspace,
  AccessDenied,
  ensurePersonalWorkspace,
} from "../src/services/workspace";
import { ClientNotFound, getClient } from "../src/services/clients";
import { CatalogItemNotFound, getCatalogItem } from "../src/services/catalog";
import { InvoiceNotFound, getInvoice } from "../src/services/invoices";
import { getClientPaymentMetrics, getPaymentDashboard } from "../src/services/payment-intelligence";
import { createExpense, ensureExpenseCategories, ExpenseNotFound } from "../src/services/expenses";
import { getReports } from "../src/services/reports";
import { createClient } from "@supabase/supabase-js";

const origin = process.env.APP_URL!;
if (
  process.env.EMAIL_MODE !== "file" ||
  !["localhost", "127.0.0.1"].includes(new URL(origin).hostname)
)
  throw new Error(
    "Integration tests require a local server with file email delivery",
  );
// Test accounts are created through sign-up without sending real emails, then removed with the admin API.
if (process.env.REQUIRE_EMAIL_VERIFICATION !== "false" || !process.env.SUPABASE_SECRET_KEY)
  throw new Error(
    "Integration tests require REQUIRE_EMAIL_VERIFICATION=false and SUPABASE_SECRET_KEY",
  );
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
).auth.admin;
const db = getDatabase();
const run = randomUUID();
const emailA = `test-a-${run}@example.test`;
const emailB = `test-b-${run}@example.test`;
const password = `Test-only-${randomUUID()}`;
const newPassword = `Changed-${randomUUID()}`;
const staleUserId = randomUUID();
let cookieA = "";
let requestSequence = 0;
let checks = 0;
function check(condition: unknown, message: string) {
  assert.ok(condition, message);
  checks++;
  console.log(`PASS ${message}`);
}
async function request(
  path: string,
  body?: object,
  cookie = "",
  extraHeaders: Record<string, string> = {},
) {
  requestSequence++;
  return fetch(`${origin}${path}`, {
    method: body ? "POST" : "GET",
    redirect: "manual",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      Cookie: cookie,
      "x-forwarded-for": `198.18.${Math.floor(Math.random() * 250)}.${requestSequence % 250}`,
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
function cookies(response: Response) {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
}
try {
  const live = await fetch(`${origin}/api/health/live`); const ready = await fetch(`${origin}/api/health/ready`);
  check(live.ok && (await live.json()).status === "ok", "liveness probe reports the running application");
  check(ready.ok && (await ready.json()).status === "ready", "readiness probe verifies database access");
  const hardenedPage = await fetch(`${origin}/login`);
  check(hardenedPage.headers.get("content-security-policy")?.includes("worker-src 'self'") === true && hardenedPage.headers.get("cross-origin-opener-policy") === "same-origin", "browser responses include hardened CSP and cross-origin isolation headers");
  const abuseToken = run.replaceAll("-", ""); let publicLimited = false;
  for(let index=0;index<11;index++){const response=await request(`/api/public/invoices/${abuseToken}/payment-promises`,{promisedFor:"2026-10-01",note:""});if(response.status===429){publicLimited=response.headers.get("retry-after")==="60";break;}}
  check(publicLimited,"public payment submissions are persistently rate limited");
  const manifestResponse = await fetch(`${origin}/manifest.webmanifest`); const manifest = await manifestResponse.json() as { display: string; start_url: string; icons: Array<{ sizes: string; purpose?: string }> };
  check(manifestResponse.ok && manifest.display === "standalone" && manifest.start_url === "/app", "web app manifest declares a standalone authenticated entry");
  check(manifest.icons.some(icon => icon.sizes === "192x192") && manifest.icons.some(icon => icon.sizes === "512x512" && icon.purpose === "maskable"), "manifest exposes required any and maskable app icons");
  const workerResponse = await fetch(`${origin}/sw.js`); const worker = await workerResponse.text();
  check(workerResponse.ok && worker.includes('url.pathname.startsWith("/api/")') && worker.includes('url.pathname.startsWith("/i/")'), "service worker explicitly bypasses private APIs and public invoice capabilities");
  const offlineResponse = await fetch(`${origin}/offline`);
  check(offlineResponse.ok && (await offlineResponse.text()).includes("offline."), "offline fallback renders without an authenticated session");
  check(
    (await request("/api/workspaces/missing")).status === 401,
    "anonymous workspace access is denied",
  );
  check(
    (
      await request("/api/auth/sign-up", {
        name: "Invalid",
        email: "not-email",
        password: "short",
      })
    ).status === 400,
    "server rejects malformed signup",
  );
  // A leftover row from a deleted account still holds emailB under an id no Supabase user has.
  await db.user.create({ data: { id: staleUserId, email: emailB, name: "Deleted Account" } });
  for (const email of [emailA, emailB]) {
    const response = await request("/api/auth/sign-up", {
      name: "Foundation Tester",
      email,
      password,
    });
    check(response.ok && (await response.json()).signedIn === true, "registration creates a signed-in account");
    // The first authenticated requests mirror the Supabase user into the app's User table; pages make several at once.
    const firstRequests = await Promise.all(
      Array.from({ length: 5 }, () => request("/api/workspaces/missing", undefined, cookies(response))),
    );
    check(firstRequests.every((first) => first.status === 404), "concurrent first requests create the app user once without errors");
  }
  const duplicate = await request("/api/auth/sign-up", { name: "Someone Else", email: emailA, password: newPassword });
  check(duplicate.ok && (await duplicate.json()).signedIn !== true && duplicate.headers.getSetCookie().length === 0, "duplicate sign-up neither signs in nor reveals the account");
  const userA = await db.user.findUniqueOrThrow({ where: { email: emailA } });
  const userB = await db.user.findUniqueOrThrow({ where: { email: emailB } });
  check(
    userB.id !== staleUserId &&
      (await db.user.findUniqueOrThrow({ where: { id: staleUserId } })).email.endsWith("@invalid"),
    "a stale row holding the email is released instead of blocking or handing over the account",
  );
  check(
    userA.emailVerified && userB.emailVerified,
    "Supabase users are mirrored into PostgreSQL",
  );
  const workspaceA = await ensurePersonalWorkspace(userA);
  const initialB = await ensurePersonalWorkspace(userB);
  // Simulate an interrupted signup, then simultaneous authenticated entry.
  await db.auditLog.deleteMany({ where: { workspaceId: initialB.id } });
  await db.workspace.delete({ where: { id: initialB.id } });
  const provisioned = await Promise.all(
    Array.from({ length: 5 }, () => ensurePersonalWorkspace(userB)),
  );
  const workspaceB = provisioned[0];
  check(
    new Set(provisioned.map((workspace) => workspace.id)).size === 1,
    "concurrent workspace recovery creates one workspace",
  );
  await ensurePersonalWorkspace(userA);
  check(
    (await db.workspace.count({ where: { ownerId: userA.id } })) === 1,
    "workspace provisioning is idempotent",
  );
  check(
    (await db.auditLog.count({
      where: { workspaceId: workspaceA.id, action: "WORKSPACE_CREATED" },
    })) === 1,
    "workspace creation audit is written once",
  );
  const signedIn = await request("/api/auth/sign-in", {
    email: emailA,
    password,
  });
  check(signedIn.ok, "verified account signs in");
  check(
    signedIn.headers
      .getSetCookie()
      .some((value) => /httponly/i.test(value) && /samesite=lax/i.test(value)),
    "session cookie is HttpOnly and SameSite",
  );
  cookieA = cookies(signedIn);
  const own = await request(
    `/api/workspaces/${workspaceA.id}`,
    undefined,
    cookieA,
  );
  check(
    own.status === 200 && (await own.json()).role === "OWNER",
    "owner can read own workspace",
  );
  check(
    own.headers.get("cache-control")?.includes("no-store"),
    "workspace API disallows caching",
  );
  check(
    (await request(`/api/workspaces/${workspaceB.id}`, undefined, cookieA))
      .status === 404,
    "tenant A cannot read tenant B workspace",
  );
  await assert.rejects(
    authorizeWorkspace(userA.id, workspaceB.id),
    AccessDenied,
  );
  checks++;
  console.log("PASS service denies cross-tenant access");
  await db.workspaceMember.create({
    data: { userId: userA.id, workspaceId: workspaceB.id, role: "STAFF" },
  });
  await assert.rejects(
    authorizeWorkspace(userA.id, workspaceB.id, ["OWNER"]),
    AccessDenied,
  );
  checks++;
  console.log("PASS staff cannot perform owner actions");
  await db.workspaceMember.delete({
    where: {
      workspaceId_userId: { workspaceId: workspaceB.id, userId: userA.id },
    },
  });
  check(
    (await request(`/api/workspaces/${workspaceB.id}`, undefined, cookieA))
      .status === 404,
    "removed membership grants no access",
  );
  const onboardingInput = {
    businessName: "Northstar Studio",
    legalName: "Northstar Studio Ltd.",
    ownerName: "Foundation Tester",
    businessEmail: emailA,
    phone: "+63 900 000 0000",
    addressLine1: "10 Example Street",
    addressLine2: "",
    city: "Makati",
    provinceState: "Metro Manila",
    postalCode: "1200",
    country: "PH",
    defaultCurrency: "PHP",
    timezone: "Asia/Manila",
    website: "https://northstar.example",
    brandColor: "#285D45",
    logoDataUrl: null,
    removeLogo: false,
    invoiceFooter: "Thank you for your business.",
    defaultPaymentTermsDays: 14,
    defaultNotes: "Please include the invoice number.",
    defaultTaxLabel: "VAT",
    defaultTaxRate: "12.0000",
    invoicePrefix: "NS-",
    startingInvoiceNumber: 2100,
    paymentInstructions: [
      {
        name: "Bank transfer",
        accountName: "Northstar Studio",
        accountReference: "000-111",
        notes: "Use the invoice number.",
        enabled: true,
      },
      {
        name: "GCash",
        accountName: "Alex Example",
        accountReference: "09000000000",
        notes: "",
        enabled: false,
      },
    ],
    workspaceId: workspaceB.id,
  };
  check(
    (
      await request(
        "/api/onboarding",
        { ...onboardingInput, defaultTaxRate: "101" },
        cookieA,
      )
    ).status === 400,
    "invalid business settings are rejected server-side",
  );
  check(
    (
      await request("/api/onboarding", onboardingInput, cookieA, {
        Origin: "https://untrusted.example",
      })
    ).status === 403,
    "cross-origin business settings mutation is rejected",
  );
  check(
    (await request("/api/onboarding", onboardingInput, cookieA)).ok,
    "business onboarding saves successfully",
  );
  const configuredA = await db.workspace.findUniqueOrThrow({
    where: { id: workspaceA.id },
    include: {
      businessProfile: true,
      paymentInstructions: { orderBy: { sortOrder: "asc" } },
    },
  });
  check(
    configuredA.name === "Northstar Studio" &&
      configuredA.onboardingCompletedAt !== null,
    "workspace defaults and onboarding completion persist",
  );
  check(
    configuredA.businessProfile?.defaultTaxRate.toString() === "12" &&
      configuredA.nextInvoiceNumber === 2100,
    "business and invoice defaults persist accurately",
  );
  check(
    configuredA.paymentInstructions.length === 2 &&
      configuredA.paymentInstructions[1].name === "GCash",
    "ordered configurable payment methods persist",
  );
  check(
    (await db.businessProfile.count({
      where: { workspaceId: workspaceB.id },
    })) === 0,
    "payload cannot select another tenant workspace",
  );
  check(
    (await db.auditLog.count({
      where: { workspaceId: workspaceA.id, action: "ONBOARDING_COMPLETED" },
    })) === 1,
    "onboarding writes an audit event",
  );
  check(
    (
      await request(
        "/api/onboarding",
        {
          ...onboardingInput,
          logoDataUrl: "data:image/png;base64,bm90IGEgcG5n",
        },
        cookieA,
      )
    ).status === 400,
    "logo content is verified rather than trusting its declared type",
  );
  const transparentPng =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X2HF1wAAAABJRU5ErkJggg==";
  check(
    (
      await request(
        "/api/onboarding",
        {
          ...onboardingInput,
          businessName: "Northstar Creative",
          logoDataUrl: transparentPng,
        },
        cookieA,
      )
    ).ok,
    "business settings and valid branding can be updated",
  );
  const logoResponse = await request("/api/business/logo", undefined, cookieA);
  check(
    logoResponse.ok &&
      logoResponse.headers.get("content-type") === "image/png" &&
      (await logoResponse.arrayBuffer()).byteLength > 8,
    "private business logo is returned with its verified media type",
  );
  check(
    (await db.auditLog.count({
      where: {
        workspaceId: workspaceA.id,
        action: "BUSINESS_SETTINGS_UPDATED",
      },
    })) === 1,
    "settings update writes a distinct audit event",
  );
  check(
    (await request("/api/clients", { name: "A", email: "invalid" }, cookieA)).status === 400,
    "invalid client details are rejected server-side",
  );
  check(
    (await request("/api/clients", { name: "Acme Client", email: "billing@acme.test" }, cookieA, { Origin: "https://untrusted.example" })).status === 403,
    "cross-origin client mutation is rejected",
  );
  const clientInput = { name: "Acme Client", company: "Acme Ltd.", email: "billing@acme.test", phone: "+63 900 111 2222", addressLine1: "1 Billing Road", addressLine2: "", city: "Makati", provinceState: "Metro Manila", postalCode: "1200", country: "PH", taxId: "TAX-1", currency: "PHP", notes: "Prefers email" };
  const createdResponse = await request("/api/clients", clientInput, cookieA);
  const created = await createdResponse.json() as { id: string };
  check(createdResponse.status === 201 && Boolean(created.id), "client creation succeeds");
  const clientRead = await request(`/api/clients/${created.id}`, undefined, cookieA);
  check(clientRead.ok && (await clientRead.json()).name === "Acme Client", "client detail is tenant scoped and readable");
  const updateResponse = await fetch(`${origin}/api/clients/${created.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookieA }, body: JSON.stringify({ ...clientInput, name: "Acme Updated", version: 1 }) });
  check(updateResponse.ok && (await updateResponse.json()).version === 2, "client details can be updated");
  await assert.rejects(getClient(userB.id, workspaceB.id, created.id), ClientNotFound);
  checks++;
  console.log("PASS client IDs cannot cross tenant boundaries");
  const staleResponse = await fetch(`${origin}/api/clients/${created.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookieA }, body: JSON.stringify({ ...clientInput, version: 1 }) });
  check(staleResponse.status === 409, "stale client updates are rejected");
  const searchResponse = await request("/api/clients?search=Updated", undefined, cookieA);
  const searchResult = await searchResponse.json() as { items: Array<{ id: string }> };
  check(searchResponse.ok && searchResult.items.some((item) => item.id === created.id), "client search returns matching records");
  const archiveResponse = await request(`/api/clients/${created.id}/archive`, { archived: true, version: 2 }, cookieA);
  check(archiveResponse.ok, "client can be archived without deletion");
  const activeAfterArchive = await request("/api/clients", undefined, cookieA);
  const archivedList = await request("/api/clients?status=archived", undefined, cookieA);
  check(!(await activeAfterArchive.json()).items.some((item: { id: string }) => item.id === created.id) && (await archivedList.json()).items.some((item: { id: string }) => item.id === created.id), "archived clients leave the active list and remain recoverable");
  check((await db.auditLog.count({ where: { workspaceId: workspaceA.id, action: { in: ["CLIENT_CREATED", "CLIENT_UPDATED", "CLIENT_ARCHIVED"] } } })) === 3, "client mutations write audit events");
  const catalogInput = { name: "Consultation", description: "Strategy session", price: "750.0000", unit: "hour", taxable: true };
  check((await request("/api/catalog", { ...catalogInput, price: "1.00001" }, cookieA)).status === 400, "catalog rejects excessive money precision");
  check((await request("/api/catalog", catalogInput, cookieA, { Origin: "https://untrusted.example" })).status === 403, "cross-origin catalog mutation is rejected");
  const catalogCreate = await request("/api/catalog", catalogInput, cookieA); const catalogCreated = await catalogCreate.json() as { id: string };
  check(catalogCreate.status === 201 && Boolean(catalogCreated.id), "catalog item creation succeeds");
  const persistedItem = await db.productService.findUniqueOrThrow({ where: { id: catalogCreated.id } });
  check(persistedItem.price.toString() === "750" && persistedItem.workspaceId === workspaceA.id, "catalog price persists as a tenant-scoped decimal");
  await assert.rejects(getCatalogItem(userB.id, workspaceB.id, catalogCreated.id), CatalogItemNotFound); checks++; console.log("PASS catalog IDs cannot cross tenant boundaries");
  const catalogUpdate = await fetch(`${origin}/api/catalog/${catalogCreated.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookieA }, body: JSON.stringify({ ...catalogInput, name: "Advisory", version: 1 }) });
  check(catalogUpdate.ok && (await catalogUpdate.json()).version === 2, "catalog items can be updated");
  const staleCatalog = await fetch(`${origin}/api/catalog/${catalogCreated.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookieA }, body: JSON.stringify({ ...catalogInput, version: 1 }) });
  check(staleCatalog.status === 409, "stale catalog updates are rejected");
  const catalogSearch = await request("/api/catalog?search=Advisory", undefined, cookieA); check(catalogSearch.ok && (await catalogSearch.json()).items.some((item: { id: string }) => item.id === catalogCreated.id), "catalog search returns matching items");
  check((await request(`/api/catalog/${catalogCreated.id}/status`, { active: false, version: 2 }, cookieA)).ok, "catalog items can be archived");
  const inactiveCatalog = await request("/api/catalog?status=inactive", undefined, cookieA); check((await inactiveCatalog.json()).items.some((item: { id: string }) => item.id === catalogCreated.id), "archived catalog items remain recoverable");
  check((await db.auditLog.count({ where: { workspaceId: workspaceA.id, action: { in: ["CATALOG_ITEM_CREATED", "CATALOG_ITEM_UPDATED", "CATALOG_ITEM_ARCHIVED"] } } })) === 3, "catalog mutations write audit events");
  const invoiceClient = await db.client.create({ data: { workspaceId: workspaceA.id, name: "Invoice Client", email: "invoice-client@example.test" } });
  const invoiceInput = { clientId: invoiceClient.id, invoiceNumber: "", issueDate: "2026-09-21", dueDate: "2026-10-05", currency: "PHP", notes: "Thanks", terms: "Due in 14 days", paymentInstructions: "Bank transfer", items: [{ description: "Consulting", unit: "hour", quantity: "2", unitPrice: "500", discountType: "PERCENT", discountValue: "10", taxRate: "12" }] };
  check((await request("/api/invoices", { ...invoiceInput, dueDate: "2026-09-20" }, cookieA)).status === 400, "invoice validation rejects a due date before issue date");
  check((await request("/api/invoices", invoiceInput, cookieA, { Origin: "https://untrusted.example" })).status === 403, "cross-origin invoice mutation is rejected");
  const invoiceCreate = await request("/api/invoices", { ...invoiceInput, total: "0.01" }, cookieA); const invoiceCreated = await invoiceCreate.json() as { id: string };
  check(invoiceCreate.status === 201 && Boolean(invoiceCreated.id), "invoice draft creation succeeds");
  const storedInvoice = await db.invoice.findUniqueOrThrow({ where: { id: invoiceCreated.id }, include: { items: true } });
  check(storedInvoice.subtotal.toString() === "1000" && storedInvoice.discountTotal.toString() === "100" && storedInvoice.taxTotal.toString() === "108" && storedInvoice.total.toString() === "1008" && storedInvoice.balanceDue.toString() === "1008", "server calculates and reconciles invoice totals");
  check(storedInvoice.items.length === 1 && storedInvoice.items[0].lineTotal.toString() === "1008", "rounded line values persist with the draft");
  await assert.rejects(getInvoice(userB.id, workspaceB.id, invoiceCreated.id), InvoiceNotFound); checks++; console.log("PASS invoice IDs cannot cross tenant boundaries");
  const parallelResponses = await Promise.all(Array.from({ length: 5 }, () => request("/api/invoices", invoiceInput, cookieA)));
  check(parallelResponses.every(response => response.status === 201), "concurrent invoice drafts allocate successfully");
  const allocated = await db.invoice.findMany({ where: { workspaceId: workspaceA.id }, select: { invoiceNumber: true } });
  check(new Set(allocated.map(invoice => invoice.invoiceNumber)).size === allocated.length, "concurrent invoice numbers are unique");
  const updateInvoiceResponse = await fetch(`${origin}/api/invoices/${invoiceCreated.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookieA }, body: JSON.stringify({ ...invoiceInput, invoiceNumber: storedInvoice.invoiceNumber, items: [{ ...invoiceInput.items[0], quantity: "3" }], version: 1 }) });
  check(updateInvoiceResponse.ok && (await updateInvoiceResponse.json()).version === 2, "draft invoices can be edited and recalculated");
  const staleInvoiceResponse = await fetch(`${origin}/api/invoices/${invoiceCreated.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookieA }, body: JSON.stringify({ ...invoiceInput, invoiceNumber: storedInvoice.invoiceNumber, version: 1 }) });
  check(staleInvoiceResponse.status === 409, "stale invoice updates are rejected");
  const duplicateNumber = await request("/api/invoices", { ...invoiceInput, invoiceNumber: storedInvoice.invoiceNumber }, cookieA);
  check(duplicateNumber.status === 409, "duplicate invoice numbers are rejected within a workspace");
  const invoiceSearch = await request(`/api/invoices?search=${encodeURIComponent(storedInvoice.invoiceNumber)}`, undefined, cookieA);
  check(invoiceSearch.ok && (await invoiceSearch.json()).items.some((invoice: { id: string }) => invoice.id === invoiceCreated.id), "invoice search returns matching drafts");
  check((await db.auditLog.count({ where: { workspaceId: workspaceA.id, action: { in: ["INVOICE_CREATED", "INVOICE_UPDATED"] } } })) === 7, "invoice creation and update audit events persist atomically");
  const sendSubject = `Invoice delivery ${run}`;
  const sendResponse = await request(`/api/invoices/${invoiceCreated.id}/send`, { to: "recipient@example.test", subject: sendSubject, message: "Please review this invoice.", version: 2 }, cookieA);
  const sendResult = await sendResponse.json() as { delivered: boolean; publicUrl: string };
  check(sendResponse.ok && sendResult.delivered && sendResult.publicUrl.startsWith(`${origin}/i/`), "issuing creates a public link and delivers local email");
  const issued = await db.invoice.findUniqueOrThrow({ where: { id: invoiceCreated.id } });
  check(issued.status === "SENT" && issued.issueSnapshot !== null && issued.publicTokenHash !== null && !sendResult.publicUrl.includes(issued.publicTokenHash), "issued invoice stores a frozen snapshot and only a token hash");
  const deliveredRecord = await db.invoiceDelivery.findFirstOrThrow({ where: { invoiceId: invoiceCreated.id } });
  check(deliveredRecord.status === "SENT" && issued.emailSentAt !== null, "successful provider acceptance is recorded truthfully");
  let sentMail: { attachments?: Array<{ filename: string; content: string }> } | undefined;
  for (const filename of (await readdir(".local/mail")).sort().reverse()) { const message = JSON.parse(await readFile(`.local/mail/${filename}`, "utf8")) as { subject: string; attachments?: Array<{ filename: string; content: string }> }; if (message.subject === sendSubject) { sentMail = message; break; } }
  check(Boolean(sentMail?.attachments?.[0]?.filename.endsWith(".pdf")) && Buffer.from(sentMail!.attachments![0].content, "base64").subarray(0,5).toString() === "%PDF-", "delivery includes a generated PDF attachment");
  const ownerPdf = await request(`/api/invoices/${invoiceCreated.id}/pdf`, undefined, cookieA);
  check(ownerPdf.ok && ownerPdf.headers.get("content-type") === "application/pdf" && Buffer.from(await ownerPdf.arrayBuffer()).subarray(0,5).toString() === "%PDF-", "owner can download the issued PDF");
  check((await request(`/api/invoices/${invoiceCreated.id}/send`, { to: "recipient@example.test", subject: sendSubject, message: "Again", version: 3 }, cookieA)).status === 409, "issued invoice cannot be sent as a new draft again");
  await db.client.update({ where: { id: invoiceClient.id }, data: { name: "Changed Client" } });
  await db.businessProfile.update({ where: { workspaceId: workspaceA.id }, data: { displayName: "Changed Business" } });
  const frozen = (await db.invoice.findUniqueOrThrow({ where: { id: invoiceCreated.id } })).issueSnapshot as { business: { name: string }; client: { name: string } };
  check(frozen.business.name === "Northstar Creative" && frozen.client.name === "Invoice Client", "issued snapshot is unchanged by later business and client edits");
  const publicPage = await fetch(sendResult.publicUrl, { redirect: "manual" });
  check(publicPage.ok && (await publicPage.text()).includes(storedInvoice.invoiceNumber), "secure public invoice page renders the issued snapshot");
  const publicToken = new URL(sendResult.publicUrl).pathname.split("/").pop()!;
  const publicPdf = await fetch(`${origin}/api/public/invoices/${publicToken}/pdf`);
  check(publicPdf.ok && publicPdf.headers.get("x-robots-tag")?.includes("noindex") === true, "public token downloads the PDF with no-index controls");
  check((await db.invoiceEvent.count({ where: { invoiceId: invoiceCreated.id, type: "PUBLIC_LINK_OPENED" } })) === 1, "public access records a privacy-conscious link-open event");
  const confirmationKey = randomUUID();
  const confirmationBody = { amount: "500", method: "Bank transfer", reference: "BANK-123", paidAt: "2026-09-21", message: "Sent from our account", idempotencyKey: confirmationKey };
  const confirmationResponse = await request(`/api/public/invoices/${publicToken}/payment-confirmations`, confirmationBody);
  const confirmationResult = await confirmationResponse.json() as { id: string; status: string };
  check(confirmationResponse.status === 202 && confirmationResult.status === "PENDING", "client can submit a pending payment confirmation");
  check((await db.invoice.findUniqueOrThrow({ where: { id: invoiceCreated.id } })).amountPaid.eq(0), "pending confirmation does not change the financial ledger");
  const duplicateConfirmation = await request(`/api/public/invoices/${publicToken}/payment-confirmations`, confirmationBody);
  check(duplicateConfirmation.status === 202 && (await duplicateConfirmation.json()).id === confirmationResult.id, "confirmation submission is idempotent");
  const promisedFor = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
  const promiseResponse = await request(`/api/public/invoices/${publicToken}/payment-promises`, { promisedFor, note: "Expected transfer date" });
  check(promiseResponse.status === 202 && await db.paymentPromise.count({ where: { invoiceId: invoiceCreated.id } }) === 1, "client can submit a payment promise");
  const inbox = await request("/api/payment-confirmations?status=PENDING", undefined, cookieA);
  check(inbox.ok && (await inbox.json()).some((item: { id: string }) => item.id === confirmationResult.id), "owner payment inbox lists the pending confirmation");
  const confirmResponse = await request(`/api/payment-confirmations/${confirmationResult.id}`, { action: "confirm" }, cookieA);
  const confirmError = confirmResponse.status === 204 ? "" : await confirmResponse.text();
  check(confirmResponse.status === 204, `owner can confirm a payment submission (${confirmResponse.status} ${confirmError})`);
  const partialInvoice = await db.invoice.findUniqueOrThrow({ where: { id: invoiceCreated.id } });
  check(partialInvoice.status === "PARTIALLY_PAID" && partialInvoice.amountPaid.eq(500) && partialInvoice.balanceDue.eq(1012), "confirmed payment atomically updates partial balance and status");
  const manualReminder = await request(`/api/invoices/${invoiceCreated.id}/reminders`, { tone: "FRIENDLY", subject: `Payment reminder for ${partialInvoice.invoiceNumber}`, message: "Your remaining balance is PHP 1,012.00." }, cookieA);
  check(manualReminder.ok && (await manualReminder.json()).delivered === true, "owner can send a partial-payment-aware manual reminder");
  check(await db.invoiceReminder.count({ where: { invoiceId: invoiceCreated.id, manual: true, status: "SENT" } }) === 1 && await db.invoiceEvent.count({ where: { invoiceId: invoiceCreated.id, type: "REMINDER_SENT" } }) === 1, "manual reminder is recorded in reminder history and invoice activity");
  const promisedRun = await request("/api/reminders/run", {}, cookieA);
  check(promisedRun.ok && (await promisedRun.json()).suppressed >= 1, "active payment promises suppress sequence reminders through the promised date");
  check((await db.payment.count({ where: { invoiceId: invoiceCreated.id, paymentConfirmationId: confirmationResult.id } })) === 1, "confirmation creates exactly one ledger payment");
  check((await request(`/api/payment-confirmations/${confirmationResult.id}`, { action: "confirm" }, cookieA)).status === 409, "reviewing a confirmation twice is rejected");
  const concurrentConfirmations = await Promise.all(["A", "B"].map(async suffix => {
    const response = await request(`/api/public/invoices/${publicToken}/payment-confirmations`, { ...confirmationBody, amount: "800", reference: `RACE-${suffix}`, idempotencyKey: randomUUID() });
    return (await response.json()) as { id: string };
  }));
  const concurrentReviews = await Promise.all(concurrentConfirmations.map(item => request(`/api/payment-confirmations/${item.id}`, { action: "confirm" }, cookieA)));
  check(concurrentReviews.filter(response => response.status === 204).length === 1 && concurrentReviews.filter(response => response.status === 409).length === 1, `concurrent confirmations cannot overpay the remaining balance (${concurrentReviews.map(response => response.status).join(",")})`);
  const afterConcurrentReview = await db.invoice.findUniqueOrThrow({ where: { id: invoiceCreated.id } });
  check(afterConcurrentReview.amountPaid.eq(1300) && afterConcurrentReview.balanceDue.eq(212) && await db.payment.count({ where: { invoiceId: invoiceCreated.id } }) === 2, "concurrent review commits exactly one financial entry");
  check((await request(`/api/invoices/${invoiceCreated.id}/payments`, { amount: "213", method: "Cash", reference: "", paidAt: "2026-09-21", note: "" }, cookieA)).status === 409, "manual overpayment is rejected");
  const finalPayment = await request(`/api/invoices/${invoiceCreated.id}/payments`, { amount: "212", method: "Cash", reference: "CASH-1", paidAt: "2026-09-21", note: "Final balance" }, cookieA);
  const finalPaymentResult = await finalPayment.json() as { id: string };
  check(finalPayment.status === 201, "owner can record the remaining payment");
  const paidInvoice = await db.invoice.findUniqueOrThrow({ where: { id: invoiceCreated.id } });
  check(paidInvoice.status === "PAID" && paidInvoice.amountPaid.eq(1512) && paidInvoice.balanceDue.eq(0) && paidInvoice.paidAt !== null, "invoice automatically transitions to paid with a zero balance");
  const attentionInvoice = await db.invoice.findFirstOrThrow({ where: { workspaceId: workspaceA.id, status: "DRAFT", id: { not: invoiceCreated.id } } });
  await db.invoice.update({ where: { id: attentionInvoice.id }, data: { status: "SENT", dueDate: new Date("2026-09-15T00:00:00.000Z"), issueSnapshot: issued.issueSnapshot as Prisma.InputJsonValue } });
  const promisedInvoice = await db.invoice.findFirstOrThrow({ where: { workspaceId: workspaceA.id, status: "DRAFT", id: { notIn: [invoiceCreated.id, attentionInvoice.id] } } });
  await db.invoice.update({ where: { id: promisedInvoice.id }, data: { status: "SENT", dueDate: new Date("2026-09-10T00:00:00.000Z") } });
  await db.paymentPromise.create({ data: { workspaceId: workspaceA.id, invoiceId: promisedInvoice.id, promisedFor: new Date("2026-09-25T00:00:00.000Z"), note: "Active promise" } });
  const sequenceRun = await request("/api/reminders/run", {}, cookieA); const sequenceResult = await sequenceRun.json() as { sent: number };
  check(sequenceRun.ok && sequenceResult.sent === 1, `sequence sends the latest eligible follow-up stage (${JSON.stringify(sequenceResult)})`);
  const repeatedRun = await request("/api/reminders/run", {}, cookieA); check(repeatedRun.ok && (await repeatedRun.json()).sent === 0, "sequence run is idempotent for an already processed stage");
  const dashboard = await getPaymentDashboard(userA.id, workspaceA.id, new Date("2026-09-21T12:00:00.000Z"));
  check(dashboard.outstanding.PHP === "2016" && dashboard.overdue.PHP === "2016" && dashboard.paidThisMonth.PHP === "1512", "dashboard currency totals reconcile with invoice and payment records");
  check(dashboard.attention.some(item => item.id === attentionInvoice.id && item.reason === "6 days overdue") && !dashboard.attention.some(item => item.id === promisedInvoice.id), "needs-attention identifies overdue invoices and suppresses active promises");
  check(dashboard.promises.some(item => item.invoiceId === promisedInvoice.id && item.active), "dashboard lists active payment promises separately");
  check(dashboard.revenue.find(item => item.month === "2026-09")?.values.PHP === "1512", "six-month revenue uses confirmed payment dates");
  const clientMetrics = await getClientPaymentMetrics(userA.id, workspaceA.id, invoiceClient.id);
  check(clientMetrics.paidInvoiceCount === 1 && clientMetrics.outstanding.PHP === "2016" && clientMetrics.totalRevenue.PHP === "1512", "client payment behavior metrics reconcile with ledger history");
  const categories = await ensureExpenseCategories(workspaceA.id); const general = categories.find(item => item.name === "General")!;
  const expenseResponse = await request("/api/expenses", { categoryId: general.id, vendor: "Cloud Host", description: "September hosting", amount: "200", currency: "PHP", incurredOn: "2026-09-21", reference: "HOST-SEP", notes: "Operating expense" }, cookieA);
  const expenseResult = await expenseResponse.json() as { id: string };
  check(expenseResponse.status === 201 && Boolean(expenseResult.id), "owner can record a categorized expense");
  await assert.rejects(createExpense(userB.id, workspaceB.id, { categoryId: general.id, vendor: "Invalid", description: "Cross tenant", amount: "1", currency: "PHP", incurredOn: "2026-09-21", reference: "", notes: "" }), ExpenseNotFound); checks++; console.log("PASS expense category IDs cannot cross tenant boundaries");
  const expenseUpdate = await fetch(`${origin}/api/expenses/${expenseResult.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookieA }, body: JSON.stringify({ categoryId: general.id, vendor: "Cloud Host", description: "September hosting", amount: "250", currency: "PHP", incurredOn: "2026-09-21", reference: "HOST-SEP", notes: "Updated", version: 1 }) });
  check(expenseUpdate.ok && (await db.expense.findUniqueOrThrow({ where: { id: expenseResult.id } })).amount.eq(250), "expense records support optimistic updates");
  const reports = await getReports(userA.id, workspaceA.id, { from: "2026-09-01", to: "2026-09-30" }, new Date("2026-09-21T12:00:00.000Z"));
  check(reports.revenue.PHP === "1512" && reports.expenses.PHP === "250" && reports.net.PHP === "1262", "revenue, expense and net cash reports reconcile with ledger rows");
  check(reports.clients.some(item => item.clientName === invoiceClient.name && item.values.PHP === "1512"), "client revenue report reconciles confirmed payments");
  check(reports.aging.days1to30.PHP === "2016", "aging report assigns current balances to the correct overdue bucket");
  const revenueCsv = await request("/api/reports/export?type=revenue&from=2026-09-01&to=2026-09-30", undefined, cookieA);
  check(revenueCsv.ok && revenueCsv.headers.get("content-type")?.includes("text/csv") === true && (await revenueCsv.text()).includes("Cloud") === false, "revenue CSV exports payment rows without expense data");
  const expenseCsv = await request("/api/reports/export?type=expenses&from=2026-09-01&to=2026-09-30", undefined, cookieA);
  check(expenseCsv.ok && (await expenseCsv.text()).includes("Cloud Host"), "expense CSV exports filtered categorized costs");
  const receipt = await request(`/api/payments/${finalPaymentResult.id}/receipt`, undefined, cookieA);
  check(receipt.ok && receipt.headers.get("content-type") === "application/pdf" && Buffer.from(await receipt.arrayBuffer()).subarray(0,5).toString() === "%PDF-", "recorded payment has a downloadable PDF receipt");
  const regeneratedResponse = await request(`/api/invoices/${invoiceCreated.id}/public-link`, {}, cookieA);
  const regenerated = await regeneratedResponse.json() as { publicUrl: string };
  check(regeneratedResponse.ok && regenerated.publicUrl !== sendResult.publicUrl, "owner can regenerate the public capability");
  const replacementToken = new URL(regenerated.publicUrl).pathname.split("/").pop()!;
  const oldLinkAfterRotation = await fetch(`${origin}/api/public/invoices/${publicToken}/pdf`);
  const newLinkAfterRotation = await fetch(`${origin}/api/public/invoices/${replacementToken}/pdf`);
  check(oldLinkAfterRotation.status === 404 && newLinkAfterRotation.ok, "regeneration immediately invalidates the previous public capability");
  const revokeResponse = await fetch(`${origin}/api/invoices/${invoiceCreated.id}/public-link`, { method: "DELETE", headers: { Origin: origin, Cookie: cookieA } });
  check(revokeResponse.status === 204 && (await fetch(`${origin}/api/public/invoices/${replacementToken}/pdf`)).status === 404, "owner can revoke public invoice access");
  check((await request(`/api/invoices/${invoiceCreated.id}/pdf`, undefined, "")).status === 401, "anonymous callers cannot use the owner PDF route");
  check(
    (
      await request("/api/auth/sign-out", {}, cookieA, {
        Origin: "https://untrusted.example",
      })
    ).status === 403,
    "cross-origin auth mutation is rejected",
  );
  check((await request("/api/auth/forgot-password", { email: emailA })).ok, "password reset email is requested");
  let resetLink = "";
  for (const filename of (await readdir(".local/mail")).sort().reverse()) {
    const message = JSON.parse(await readFile(`.local/mail/${filename}`, "utf8")) as { to: string; text: string };
    if (message.to !== emailA) continue;
    const url = new URL(message.text.match(/https?:\/\/\S+\/auth\/callback\S+/)![0]);
    resetLink = url.pathname + url.search;
    break;
  }
  // Opened with no cookies from the requesting browser, as on another device.
  const resetLanding = await request(resetLink);
  check(resetLanding.headers.get("location")?.endsWith("/reset-password"), "password reset link opens the reset page");
  const resetCookie = cookies(resetLanding);
  check(
    (await request("/api/auth/reset-password", { password: newPassword }, resetCookie)).ok,
    "password reset link works",
  );
  check(
    (await request(resetLink)).headers.get("location")?.includes("error=invalid_link"),
    "reset link cannot be reused",
  );
  check(
    (await request("/api/auth/reset-password", { password: newPassword }, resetCookie)).status === 401,
    "reset session is ended after the password changes",
  );  check(
    (await request(`/api/workspaces/${workspaceA.id}`, undefined, cookieA))
      .status === 401,
    "password reset revokes existing sessions",
  );
  check(
    (await request("/api/auth/sign-in", { email: emailA, password }))
      .status === 401,
    "old password no longer works",
  );
  const renewed = await request("/api/auth/sign-in", {
    email: emailA,
    password: newPassword,
  });
  check(renewed.ok, "new password signs in");
  check(
    renewed.headers.getSetCookie().filter((value) => value.startsWith("sb-")).every((value) => /Max-Age=604800\b/.test(value) && /HttpOnly/i.test(value)),
    "session cookies are HttpOnly and last seven days",
  );
  cookieA = cookies(renewed);
  const otherDevice = cookies(await request("/api/auth/sign-in", { email: emailA, password: newPassword }));
  check(
    (await request("/api/auth/sign-out", {}, cookieA)).ok,
    "logout succeeds",
  );
  check(
    (await request(`/api/workspaces/${workspaceA.id}`, undefined, otherDevice)).ok,
    "logout keeps the user's other sessions signed in",
  );
  check(
    (await request(`/api/workspaces/${workspaceA.id}`, undefined, cookieA))
      .status === 401,
    "logged-out cookie grants no access",
  );
  const limiterIp = `198.19.${Math.floor(Math.random() * 250)}.1`;
  let limited = false;
  for (let i = 0; i < 7; i++) {
    const response = await request(
      "/api/auth/sign-in",
      { email: emailA, password: "wrong-password" },
      "",
      { "x-forwarded-for": limiterIp },
    );
    if (response.status === 429) {
      limited = true;
      break;
    }
  }
  check(limited, "repeated failed logins are rate limited");
  console.log(
    `\n${checks} integration checks passed against PostgreSQL and HTTP routes.`,
  );
} finally {
  const users = await db.user.findMany({
    where: { email: { in: [emailA, emailB] } },
    select: { id: true },
  });
  const userIds = [...users.map((user) => user.id), staleUserId];
  const workspaces = await db.workspace.findMany({
    where: { ownerId: { in: userIds } },
    select: { id: true },
  });
  await db.expense.deleteMany({ where: { workspaceId: { in: workspaces.map((workspace) => workspace.id) } } });
  await db.expenseCategory.deleteMany({ where: { workspaceId: { in: workspaces.map((workspace) => workspace.id) } } });
  await db.invoiceReminder.deleteMany({ where: { workspaceId: { in: workspaces.map((workspace) => workspace.id) } } });
  await db.reminderRule.deleteMany({ where: { workspaceId: { in: workspaces.map((workspace) => workspace.id) } } });
  await db.payment.deleteMany({ where: { workspaceId: { in: workspaces.map((workspace) => workspace.id) } } });
  await db.paymentConfirmation.deleteMany({ where: { workspaceId: { in: workspaces.map((workspace) => workspace.id) } } });
  await db.paymentPromise.deleteMany({ where: { workspaceId: { in: workspaces.map((workspace) => workspace.id) } } });
  await db.invoice.deleteMany({ where: { workspaceId: { in: workspaces.map((workspace) => workspace.id) } } });
  await db.auditLog.deleteMany({
    where: { workspaceId: { in: workspaces.map((workspace) => workspace.id) } },
  });
  await db.workspace.deleteMany({ where: { ownerId: { in: userIds } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  // Remove the test accounts from the shared Supabase Auth user list too.
  const { data: listed } = await supabaseAdmin.listUsers({ perPage: 1000 });
  for (const user of listed?.users ?? [])
    if (user.email === emailA || user.email === emailB)
      await supabaseAdmin.deleteUser(user.id);
  await db.$disconnect();
}
