import { randomUUID } from "node:crypto";
import { getDatabase } from "@/lib/db";
import { saveBusinessProfile } from "@/services/business-profile";
import { createCatalogItem } from "@/services/catalog";
import { createClient } from "@/services/clients";
import { createExpense, ensureExpenseCategories } from "@/services/expenses";
import { getPublicInvoice, hashToken, issueAndSendInvoice } from "@/services/invoice-issuing";
import { createInvoice } from "@/services/invoices";
import { recordPayment, submitPaymentConfirmation, submitPaymentPromise } from "@/services/payments";
import { ensureReminderRules } from "@/services/reminders";

const DAY = 86_400_000;

const clients = [
  ["Maya Santos", "Kapé Collective", "maya.santos@example.com", "Quezon City"],
  ["Paolo Reyes", "Tidepool Surf Co.", "paolo.reyes@example.com", "San Juan, La Union"],
  ["Andrea Lim", "Northwind Bakery", "andrea.lim@example.com", "Pasig City"],
  ["Carlo Mendoza", "Bayani Fitness", "carlo.mendoza@example.com", "Taguig City"],
  ["Bea Villanueva", "Sampaguita Hotels", "bea.villanueva@example.com", "Cebu City"],
  ["Jon Aquino", "Verde Grocers", "jon.aquino@example.com", "Makati City"],
] as const;

const catalog = [
  ["Brand identity package", "Logo suite, colour palette, typography and a short brand guide", "45000", "project"],
  ["Logo refresh", "Modernised mark with two revision rounds", "18000", "project"],
  ["Landing page design", "One responsive page, desktop and mobile layouts", "35000", "page"],
  ["Social media kit", "12 post templates and 4 story templates", "12000", "kit"],
  ["Design retainer", "Up to 20 hours of design support per month", "25000", "month"],
  ["Design hours", "Ad-hoc design and production work", "1500", "hour"],
] as const;

// [client, issued days ago, payment terms, [catalog item, quantity][], what happens next]
type Scenario =
  | { kind: "paid"; paidDaysAgo: number }
  | { kind: "partial"; paidDaysAgo: number }
  | { kind: "viewed"; viewedDaysAgo: number }
  | { kind: "promise"; viewedDaysAgo: number; promisedInDays: number }
  | { kind: "overdue" }
  | { kind: "confirm"; submittedDaysAgo: number }
  | { kind: "draft" };
const invoices: [number, number, number, [number, number][], Scenario][] = [
  [0, 86, 30, [[0, 1]], { kind: "paid", paidDaysAgo: 64 }],
  [1, 72, 15, [[3, 1], [5, 6]], { kind: "paid", paidDaysAgo: 60 }],
  [2, 61, 30, [[1, 1]], { kind: "overdue" }],
  [3, 47, 30, [[4, 1], [5, 4]], { kind: "overdue" }],
  [4, 26, 30, [[2, 1], [3, 1]], { kind: "partial", paidDaysAgo: 12 }],
  [5, 21, 30, [[4, 1]], { kind: "promise", viewedDaysAgo: 18, promisedInDays: 6 }],
  [0, 17, 30, [[3, 1], [5, 8]], { kind: "confirm", submittedDaysAgo: 2 }],
  [1, 12, 30, [[2, 1]], { kind: "viewed", viewedDaysAgo: 9 }],
  [3, 6, 30, [[5, 12]], { kind: "viewed", viewedDaysAgo: 3 }],
  [2, 2, 30, [[1, 1], [3, 1]], { kind: "draft" }],
];

// [category, vendor, description, amount, days ago]
const expenses: [string, string, string, string, number][] = [
  ["Software", "Adobe", "Creative Cloud, all apps", "3500", 84],
  ["Office", "Habitat Coworking", "Hot desk, monthly pass", "4500", 75],
  ["Contractors", "Rina Tolentino", "Copywriting for Tidepool launch", "8000", 66],
  ["Software", "Figma", "Professional plan", "1200", 54],
  ["Travel", "Grab", "Client workshop, Pasig", "650", 40],
  ["Marketing", "Meta", "Portfolio promotion, Instagram", "2000", 31],
  ["General", "Office Warehouse", "Printer ink and sketchbooks", "900", 19],
  ["Software", "Namecheap", "Domain and email renewal", "1100", 8],
];

/**
 * Fills a fresh demo workspace with a believable studio's books, through the real services.
 * Services stamp "now", so after each call only timestamp columns are moved into the past.
 */
export async function seedDemoWorkspace(userId: string, workspaceId: string, now = new Date()) {
  const db = getDatabase();
  const day = (offset: number) => new Date(now.getTime() + offset * DAY).toISOString().slice(0, 10);
  // Every backdated time is at least a day old, so "created in the last 12 hours" means "not yet backdated".
  const at = (daysAgo: number, hour = 10) =>
    new Date(new Date(`${day(-daysAgo)}T00:00:00.000Z`).getTime() + (hour - 8) * 3_600_000); // Manila is UTC+8
  const backdate = async (when: Date) => {
    const where = { workspaceId, createdAt: { gt: new Date(Date.now() - 12 * 3_600_000) } };
    const data = { createdAt: when };
    await db.$transaction([
      db.auditLog.updateMany({ where, data }),
      db.client.updateMany({ where, data }),
      db.productService.updateMany({ where, data }),
      db.invoice.updateMany({ where, data }),
      db.invoiceItem.updateMany({ where, data }),
      db.invoiceEvent.updateMany({ where, data }),
      db.invoiceDelivery.updateMany({ where, data }),
      db.payment.updateMany({ where, data }),
      db.paymentPromise.updateMany({ where, data }),
      db.paymentConfirmation.updateMany({ where, data }),
      db.expense.updateMany({ where, data }),
    ]);
  };

  const setupAt = at(95);
  await saveBusinessProfile(userId, workspaceId, {
    businessName: "Lumen & Line Studio",
    legalName: "Lumen & Line Creative Services",
    ownerName: "Lia Navarro",
    businessEmail: "hello@example.com",
    phone: "+63 917 555 0142",
    addressLine1: "2F Kalye Building, 88 Mabini Street",
    addressLine2: "",
    city: "Makati City",
    provinceState: "Metro Manila",
    postalCode: "1210",
    country: "PH",
    defaultCurrency: "PHP",
    timezone: "Asia/Manila",
    website: "https://example.com",
    brandColor: "#1C4030",
    logoDataUrl: null,
    removeLogo: false,
    invoiceFooter: "Thank you for working with Lumen & Line Studio.",
    defaultPaymentTermsDays: 30,
    defaultNotes: "Payment is due within 30 days. Thank you!",
    defaultTaxLabel: "VAT",
    defaultTaxRate: "12",
    invoicePrefix: "LL-",
    startingInvoiceNumber: 1041,
    paymentInstructions: [
      { name: "GCash", accountName: "Lia Navarro", accountReference: "0917 555 0142", notes: "Send a screenshot of the receipt.", enabled: true },
      { name: "Bank transfer", accountName: "Lumen & Line Creative Services", accountReference: "BPI 1234-5678-90", notes: "", enabled: true },
    ],
  });
  await db.workspace.update({ where: { id: workspaceId }, data: { onboardingCompletedAt: setupAt } });
  await ensureReminderRules(workspaceId);
  const categories = await ensureExpenseCategories(workspaceId);
  const clientIds: string[] = [];
  for (const [name, company, email, city] of clients)
    clientIds.push(
      (await createClient(userId, workspaceId, {
        name, company, email, phone: "", addressLine1: "", addressLine2: "", city, provinceState: "",
        postalCode: "", country: "PH", taxId: "", currency: "PHP", notes: "",
      })).id,
    );
  for (const [name, description, price, unit] of catalog)
    await createCatalogItem(userId, workspaceId, { name, description, price, unit, taxable: true });
  await backdate(setupAt);

  const paymentInstructions = "GCash — Lia Navarro — 0917 555 0142\nBank transfer — Lumen & Line Creative Services — BPI 1234-5678-90";
  for (const [clientIndex, issuedDaysAgo, terms, lines, scenario] of invoices) {
    const invoice = await createInvoice(userId, workspaceId, {
      clientId: clientIds[clientIndex],
      invoiceNumber: "",
      issueDate: day(-issuedDaysAgo),
      dueDate: day(terms - issuedDaysAgo),
      currency: "PHP",
      notes: "Payment is due within the agreed terms. Thank you!",
      terms: "",
      paymentInstructions,
      items: lines.map(([item, quantity]) => ({
        description: catalog[item][0], unit: catalog[item][3], quantity: String(quantity),
        unitPrice: catalog[item][2], discountType: "NONE", discountValue: "0", taxRate: "12",
      })),
    });
    const issuedAt = at(issuedDaysAgo, 9);
    await backdate(issuedAt);
    if (scenario.kind === "draft") continue;

    const { publicUrl } = await issueAndSendInvoice(userId, workspaceId, invoice.id, {
      to: invoice.clientEmail,
      subject: `Invoice ${invoice.invoiceNumber} from Lumen & Line Studio`,
      message: `Hi ${invoice.clientName.split(" ")[0]},\n\nPlease find invoice ${invoice.invoiceNumber} attached.`,
      version: invoice.version,
    });
    await db.invoice.update({ where: { id: invoice.id }, data: { sentAt: issuedAt, issuedAt, emailSentAt: issuedAt } });
    await db.invoiceDelivery.updateMany({ where: { invoiceId: invoice.id }, data: { attemptedAt: issuedAt, sentAt: issuedAt } });
    await backdate(issuedAt);
    const token = new URL(publicUrl).pathname.split("/").pop()!;
    const tokenHash = hashToken(token);

    if (scenario.kind === "viewed" || scenario.kind === "promise") {
      await getPublicInvoice(token);
      await backdate(at(scenario.viewedDaysAgo, 14));
    }
    if (scenario.kind === "promise") {
      await submitPaymentPromise(tokenHash, { promisedFor: day(scenario.promisedInDays), note: "Releasing payment after our board signs off." });
      await backdate(at(scenario.viewedDaysAgo, 15));
    }
    if (scenario.kind === "paid" || scenario.kind === "partial") {
      const amount = scenario.kind === "paid" ? invoice.total : invoice.total.div(2).toDecimalPlaces(2);
      await recordPayment(userId, workspaceId, invoice.id, {
        amount: amount.toFixed(2), method: scenario.kind === "paid" ? "Bank transfer" : "GCash",
        reference: `REF-${invoice.invoiceNumber}`, paidAt: day(-scenario.paidDaysAgo), note: "",
      });
      const paidAt = at(scenario.paidDaysAgo, 16);
      if (scenario.kind === "paid") await db.invoice.update({ where: { id: invoice.id }, data: { paidAt } });
      await backdate(paidAt);
    }
    if (scenario.kind === "confirm") {
      await submitPaymentConfirmation(tokenHash, {
        amount: invoice.total.toFixed(2), method: "GCash", reference: "GC-7781-2034",
        paidAt: day(-scenario.submittedDaysAgo), message: "Paid in full via GCash, receipt attached.", idempotencyKey: randomUUID(),
      });
      await backdate(at(scenario.submittedDaysAgo, 11));
    }
  }

  for (const [category, vendor, description, amount, daysAgo] of expenses) {
    await createExpense(userId, workspaceId, {
      categoryId: categories.find((item) => item.name === category)!.id,
      vendor, description, amount, currency: "PHP", incurredOn: day(-daysAgo), reference: "", notes: "",
    });
    await backdate(at(daysAgo, 12));
  }
}
