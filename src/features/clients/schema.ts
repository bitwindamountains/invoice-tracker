import { z } from "zod";
import { supportedCountries, supportedCurrencies } from "@/features/onboarding/schema";

const optionalText = (maximum: number) => z.string().trim().max(maximum).transform((value) => value || null);

export const clientSchema = z.object({
  name: z.string().trim().min(2).max(120),
  company: optionalText(120),
  email: z.email().max(254),
  phone: optionalText(40),
  addressLine1: optionalText(200),
  addressLine2: optionalText(200),
  city: optionalText(100),
  provinceState: optionalText(100),
  postalCode: optionalText(24),
  country: z.string().refine((value) => !value || supportedCountries.some(([code]) => code === value), "Choose a supported country").transform((value) => value || null),
  taxId: optionalText(80),
  currency: z.string().refine((value) => !value || supportedCurrencies.includes(value as (typeof supportedCurrencies)[number]), "Choose a supported currency").transform((value) => value || null),
  notes: optionalText(2000),
});

export const clientUpdateSchema = clientSchema.extend({ version: z.number().int().positive() });
export const archiveClientSchema = z.object({ archived: z.boolean(), version: z.number().int().positive() });
export const clientListSchema = z.object({
  search: z.string().trim().max(100).default(""),
  status: z.enum(["active", "archived"]).default("active"),
  page: z.coerce.number().int().positive().max(10_000).default(1),
});

export type ClientInput = z.input<typeof clientSchema>;
export type ClientValues = z.output<typeof clientSchema>;
