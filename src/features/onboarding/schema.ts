import { z } from "zod";

export const supportedCurrencies = [
  "PHP",
  "USD",
  "EUR",
  "GBP",
  "AUD",
  "CAD",
  "SGD",
  "JPY",
] as const;
export const supportedTimezones = [
  "Asia/Manila",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
] as const;
export const supportedCountries = [
  ["PH", "Philippines"],
  ["US", "United States"],
  ["GB", "United Kingdom"],
  ["AU", "Australia"],
  ["CA", "Canada"],
  ["SG", "Singapore"],
  ["JP", "Japan"],
  ["DE", "Germany"],
  ["FR", "France"],
  ["OTHER", "Other"],
] as const;

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .transform((value) => value || null);
const httpUrl = z
  .string()
  .trim()
  .max(300)
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "Enter a complete http:// or https:// address")
  .transform((value) => value || null);

export const paymentInstructionSchema = z.object({
  name: z.string().trim().min(2).max(50),
  accountName: optionalText(100),
  accountReference: optionalText(120),
  notes: optionalText(500),
  enabled: z.boolean(),
});

export const onboardingSchema = z
  .object({
    businessName: z.string().trim().min(2).max(120),
    legalName: optionalText(160),
    ownerName: z.string().trim().min(2).max(100),
    businessEmail: z.email().max(254),
    phone: optionalText(40),
    addressLine1: z.string().trim().min(2).max(200),
    addressLine2: optionalText(200),
    city: z.string().trim().min(2).max(100),
    provinceState: optionalText(100),
    postalCode: optionalText(24),
    country: z
      .string()
      .trim()
      .refine(
        (value) => supportedCountries.some(([code]) => code === value),
        "Choose a supported country",
      ),
    defaultCurrency: z.enum(supportedCurrencies),
    timezone: z.enum(supportedTimezones),
    website: httpUrl,
    brandColor: z.string().regex(/^#[0-9A-F]{6}$/i),
    logoDataUrl: z.string().nullable(),
    removeLogo: z.boolean(),
    invoiceFooter: optionalText(500),
    defaultPaymentTermsDays: z.number().int().min(0).max(365),
    defaultNotes: optionalText(2000),
    defaultTaxLabel: z.string().trim().min(1).max(40),
    defaultTaxRate: z
      .string()
      .regex(/^\d{1,3}(\.\d{1,4})?$/)
      .refine((value) => Number(value) <= 100, "Tax rate cannot exceed 100"),
    invoicePrefix: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9-]{1,12}$/),
    startingInvoiceNumber: z.number().int().min(1).max(999_999_999),
    paymentInstructions: z.array(paymentInstructionSchema).min(1).max(8),
  })
  .superRefine((value, context) => {
    const names = new Set<string>();
    value.paymentInstructions.forEach((instruction, index) => {
      const normalized = instruction.name.toLocaleLowerCase("en");
      if (names.has(normalized))
        context.addIssue({
          code: "custom",
          path: ["paymentInstructions", index, "name"],
          message: "Payment method names must be unique",
        });
      names.add(normalized);
    });
  });

export type OnboardingInput = z.input<typeof onboardingSchema>;
export type OnboardingValues = z.output<typeof onboardingSchema>;
