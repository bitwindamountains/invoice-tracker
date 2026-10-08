import { z } from "zod";

const amount = z.string().trim().regex(/^\d{1,15}(\.\d{1,4})?$/, "Enter a valid positive amount").refine(value => Number(value) > 0, "Amount must be greater than zero");
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()), "Enter a valid date");
export const expenseSchema = z.object({
  categoryId: z.string().min(1).max(128), vendor: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(500), amount, currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/), incurredOn: date,
  reference: z.string().trim().max(200).transform(value => value || null), notes: z.string().trim().max(1000).transform(value => value || null),
});
export const expenseUpdateSchema = expenseSchema.extend({ version: z.number().int().positive() });
export const expenseCategorySchema = z.object({ name: z.string().trim().min(2).max(80) });
export const expenseCategoryStatusSchema = z.object({ active: z.boolean(), version: z.number().int().positive() });
export const expenseListSchema = z.object({
  search: z.string().trim().max(100).default(""), category: z.string().max(128).default("all"),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().max(10_000).default(1),
});
export const reportQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).refine(value => value.from <= value.to, { message: "Start date must be on or before end date" });
