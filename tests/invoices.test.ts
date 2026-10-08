import { describe, expect, it } from "vitest";
import { calculateInvoice, InvoiceCalculationError } from "@/services/invoice-calculation";
import { invoiceCreateSchema } from "@/features/invoices/schema";
const line = { description: "Consulting", unit: "hour", quantity: "2", unitPrice: "500", discountType: "NONE" as const, discountValue: "0", taxRate: "0" };
describe("authoritative invoice calculations", () => {
  it("multiplies quantity and rate using decimals", () => { const result = calculateInvoice([line], "PHP"); expect(result.subtotal.toFixed(2)).toBe("1000.00"); expect(result.total.toFixed(2)).toBe("1000.00"); });
  it("applies percentage discounts before tax", () => { const result = calculateInvoice([{ ...line, quantity: "1", unitPrice: "1000", discountType: "PERCENT", discountValue: "10", taxRate: "12" }], "PHP"); expect(result.discountTotal.toFixed(2)).toBe("100.00"); expect(result.taxTotal.toFixed(2)).toBe("108.00"); expect(result.total.toFixed(2)).toBe("1008.00"); });
  it("uses half-up zero-decimal rounding for JPY", () => { const result = calculateInvoice([{ ...line, quantity: "1", unitPrice: "100.5" }], "JPY"); expect(result.subtotal.toFixed(0)).toBe("101"); expect(result.total.toFixed(0)).toBe("101"); });
  it("reconciles totals from rounded lines", () => { const result = calculateInvoice([{ ...line, quantity: "1", unitPrice: "0.335" }, { ...line, quantity: "1", unitPrice: "0.335" }], "USD"); expect(result.lines.map(item => item.lineTotal.toFixed(2))).toEqual(["0.34", "0.34"]); expect(result.total.toFixed(2)).toBe("0.68"); });
  it("rejects discounts above the line base", () => { expect(() => calculateInvoice([{ ...line, quantity: "1", unitPrice: "10", discountType: "FIXED", discountValue: "10.01" }], "PHP")).toThrow(InvoiceCalculationError); expect(() => calculateInvoice([{ ...line, discountType: "PERCENT", discountValue: "100.01" }], "PHP")).toThrow(InvoiceCalculationError); });
  it("rejects reversed dates and non-decimal inputs", () => { const input = { clientId: "client", invoiceNumber: "", issueDate: "2026-09-21", dueDate: "2026-09-20", currency: "PHP", notes: "", terms: "", paymentInstructions: "", items: [line] }; expect(invoiceCreateSchema.safeParse(input).success).toBe(false); expect(invoiceCreateSchema.safeParse({ ...input, dueDate: "2026-09-22", items: [{ ...line, unitPrice: "1e3" }] }).success).toBe(false); });
});
