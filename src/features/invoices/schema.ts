import { z } from "zod";
import { supportedCurrencies } from "@/features/onboarding/schema";
const decimal = (whole: number, places: number) => z.string().trim().regex(new RegExp(`^\\d{1,${whole}}(\\.\\d{1,${places}})?$`), "Enter a valid non-negative decimal");
export const invoiceItemSchema = z.object({
  description: z.string().trim().min(1).max(500), unit: z.string().trim().min(1).max(40),
  quantity: decimal(11, 4).refine((v) => !/^0+(\.0+)?$/.test(v), "Quantity must be greater than zero"),
  unitPrice: decimal(15, 4), discountType: z.enum(["NONE", "PERCENT", "FIXED"]), discountValue: decimal(15, 4), taxRate: decimal(3, 4).refine((v) => Number(v) <= 100, "Tax cannot exceed 100%"),
});
const baseInvoice = z.object({ clientId: z.string().min(1).max(128), invoiceNumber: z.string().trim().max(50), issueDate: z.iso.date(), dueDate: z.iso.date(), currency: z.enum(supportedCurrencies), notes: z.string().trim().max(2000).transform(v => v || null), terms: z.string().trim().max(2000).transform(v => v || null), paymentInstructions: z.string().trim().max(2000).transform(v => v || null), items: z.array(invoiceItemSchema).min(1).max(100) }).refine(v => v.dueDate >= v.issueDate, { path: ["dueDate"], message: "Due date cannot be before issue date" });
export const invoiceCreateSchema = baseInvoice;
export const invoiceUpdateSchema = baseInvoice.and(z.object({ version: z.number().int().positive() }));
export const invoiceListSchema = z.object({ search: z.string().trim().max(100).default(""), status: z.enum(["all", "DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "VOID"]).default("all"), page: z.coerce.number().int().positive().max(10_000).default(1) });
export type InvoiceInput = z.output<typeof invoiceCreateSchema>;
