import { Prisma } from "@/generated/prisma/client";
import type { InvoiceInput } from "@/features/invoices/schema";
export const CALCULATION_VERSION = 1;
export function currencyScale(currency: string) { return currency === "JPY" ? 0 : 2; }
function round(value: Prisma.Decimal, scale: number) { return value.toDecimalPlaces(scale, Prisma.Decimal.ROUND_HALF_UP); }
export class InvoiceCalculationError extends Error { constructor(public field: string, message: string) { super(message); } }
export function calculateInvoice(items: InvoiceInput["items"], currency: string) {
  const scale = currencyScale(currency); let subtotal = new Prisma.Decimal(0); let discountTotal = new Prisma.Decimal(0); let taxTotal = new Prisma.Decimal(0); let total = new Prisma.Decimal(0);
  const lines = items.map((item, index) => { const quantity = new Prisma.Decimal(item.quantity); const unitPrice = new Prisma.Decimal(item.unitPrice); const discountValue = new Prisma.Decimal(item.discountValue); const taxRate = new Prisma.Decimal(item.taxRate); const base = round(quantity.mul(unitPrice), scale); let discount = new Prisma.Decimal(0); if (item.discountType === "PERCENT") { if (discountValue.gt(100)) throw new InvoiceCalculationError(`items.${index}.discountValue`, "Percentage discount cannot exceed 100%"); discount = round(base.mul(discountValue).div(100), scale); } else if (item.discountType === "FIXED") { discount = round(discountValue, scale); if (discount.gt(base)) throw new InvoiceCalculationError(`items.${index}.discountValue`, "Fixed discount cannot exceed the line subtotal"); } const taxable = base.minus(discount); const tax = round(taxable.mul(taxRate).div(100), scale); const lineTotal = taxable.plus(tax); subtotal = subtotal.plus(base); discountTotal = discountTotal.plus(discount); taxTotal = taxTotal.plus(tax); total = total.plus(lineTotal); return { ...item, quantity, unitPrice, discountValue, taxRate, subtotal: base, discountAmount: discount, taxAmount: tax, lineTotal, sortOrder: index }; });
  return { lines, subtotal, discountTotal, taxTotal, total, amountPaid: new Prisma.Decimal(0), balanceDue: total, calculationVersion: CALCULATION_VERSION };
}
