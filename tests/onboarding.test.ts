import { describe, expect, it } from "vitest";
import { onboardingSchema } from "../src/features/onboarding/schema";

const valid = {
  businessName: "Northstar Studio",
  legalName: "",
  ownerName: "Alex Example",
  businessEmail: "billing@example.test",
  phone: "",
  addressLine1: "10 Example Street",
  addressLine2: "",
  city: "Makati",
  provinceState: "Metro Manila",
  postalCode: "1200",
  country: "PH",
  defaultCurrency: "PHP",
  timezone: "Asia/Manila",
  website: "https://example.test",
  brandColor: "#285D45",
  logoDataUrl: null,
  removeLogo: false,
  invoiceFooter: "Thank you.",
  defaultPaymentTermsDays: 30,
  defaultNotes: "",
  defaultTaxLabel: "VAT",
  defaultTaxRate: "12.0000",
  invoicePrefix: "INV-",
  startingInvoiceNumber: 1001,
  paymentInstructions: [
    {
      name: "Bank transfer",
      accountName: "Northstar Studio",
      accountReference: "1234",
      notes: "",
      enabled: true,
    },
  ],
};

describe("business onboarding validation", () => {
  it("normalizes optional fields and prefix", () => {
    const result = onboardingSchema.parse({
      ...valid,
      invoicePrefix: "inv-",
      website: "",
    });
    expect(result.invoicePrefix).toBe("INV-");
    expect(result.website).toBeNull();
    expect(result.legalName).toBeNull();
  });
  it("rejects duplicate payment method names without case sensitivity", () => {
    const result = onboardingSchema.safeParse({
      ...valid,
      paymentInstructions: [
        ...valid.paymentInstructions,
        { ...valid.paymentInstructions[0], name: "BANK TRANSFER" },
      ],
    });
    expect(result.success).toBe(false);
  });
  it("rejects unsupported currency and time zone", () => {
    expect(
      onboardingSchema.safeParse({ ...valid, defaultCurrency: "BTC" }).success,
    ).toBe(false);
    expect(
      onboardingSchema.safeParse({ ...valid, timezone: "Somewhere/Unknown" })
        .success,
    ).toBe(false);
  });
  it("rejects tax rates above 100 and unsafe website protocols", () => {
    expect(
      onboardingSchema.safeParse({ ...valid, defaultTaxRate: "100.0001" })
        .success,
    ).toBe(false);
    expect(
      onboardingSchema.safeParse({ ...valid, website: "javascript:alert(1)" })
        .success,
    ).toBe(false);
  });
});
