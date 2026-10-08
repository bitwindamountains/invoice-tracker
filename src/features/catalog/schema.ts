import { z } from "zod";

const price = z.string().trim().regex(/^\d{1,15}(\.\d{1,4})?$/, "Enter a valid price with up to 4 decimal places");
export const catalogItemSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).transform((value) => value || null),
  price,
  unit: z.string().trim().min(1).max(40),
  taxable: z.boolean(),
});
export const catalogItemUpdateSchema = catalogItemSchema.extend({ version: z.number().int().positive() });
export const catalogStatusSchema = z.object({ active: z.boolean(), version: z.number().int().positive() });
export const catalogListSchema = z.object({
  search: z.string().trim().max(100).default(""),
  status: z.enum(["active", "inactive"]).default("active"),
  page: z.coerce.number().int().positive().max(10_000).default(1),
});
