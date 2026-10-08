import { describe, expect, it } from "vitest";
import { generateInvoicePdf } from "@/services/invoice-pdf";
import type { InvoiceSnapshot } from "@/features/invoices/snapshot";
const snapshot: InvoiceSnapshot = { version: 1, invoiceNumber: "INV-1001", issueDate: "2026-09-21", dueDate: "2026-10-05", currency: "PHP", business: { name: "Northstar Studio", legalName: null, email: "hello@example.test", phone: null, address: "10 Example Street\nMakati\nPH", taxLabel: "VAT", footer: "Thank you" }, client: { name: "Acme Client", company: "Acme Ltd.", email: "billing@acme.test", address: "1 Billing Road\nMakati" }, lines: [{ description: "Consulting", unit: "hour", quantity: "2", unitPrice: "500", discountAmount: "100", taxAmount: "108", lineTotal: "1008" }], subtotal: "1000", discountTotal: "100", taxTotal: "108", total: "1008", notes: "Thank you", terms: "Due in 14 days", paymentInstructions: "Bank transfer", calculationVersion: 1 };
describe("invoice PDF", () => {
  it("generates deterministic PDF bytes from a frozen snapshot", async () => { const first = await generateInvoicePdf(snapshot); const second = await generateInvoicePdf(snapshot); expect(Buffer.from(first).subarray(0,5).toString()).toBe("%PDF-"); expect(first.length).toBeGreaterThan(1500); expect(Buffer.compare(Buffer.from(first), Buffer.from(second))).toBe(0); });
});
