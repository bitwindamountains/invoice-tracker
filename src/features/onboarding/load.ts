import { getDatabase } from "@/lib/db";
import type { BusinessSetupForm } from "./types";

export async function loadBusinessSetup(
  workspaceId: string,
  user: { name: string; email: string },
): Promise<BusinessSetupForm> {
  const workspace = await getDatabase().workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    include: {
      businessProfile: true,
      paymentInstructions: { orderBy: { sortOrder: "asc" } },
    },
  });
  const profile = workspace.businessProfile;
  return {
    businessName: profile?.displayName ?? "",
    legalName: profile?.legalName ?? "",
    ownerName: profile?.ownerName ?? user.name,
    businessEmail: profile?.email ?? user.email,
    phone: profile?.phone ?? "",
    addressLine1: profile?.addressLine1 ?? "",
    addressLine2: profile?.addressLine2 ?? "",
    city: profile?.city ?? "",
    provinceState: profile?.provinceState ?? "",
    postalCode: profile?.postalCode ?? "",
    country: profile?.country ?? "PH",
    defaultCurrency: workspace.defaultCurrency,
    timezone: workspace.timezone,
    website: profile?.website ?? "",
    brandColor: profile?.brandColor ?? "#285D45",
    invoiceFooter: profile?.invoiceFooter ?? "",
    defaultPaymentTermsDays: profile?.defaultPaymentTermsDays ?? 30,
    defaultNotes: profile?.defaultNotes ?? "",
    defaultTaxLabel: profile?.defaultTaxLabel ?? "Tax",
    defaultTaxRate: profile?.defaultTaxRate.toString() ?? "0",
    invoicePrefix: workspace.invoicePrefix,
    startingInvoiceNumber: workspace.nextInvoiceNumber,
    hasLogo: Boolean(profile?.logoData),
    paymentInstructions: workspace.paymentInstructions.length
      ? workspace.paymentInstructions.map((instruction) => ({
          name: instruction.name,
          accountName: instruction.accountName ?? "",
          accountReference: instruction.accountReference ?? "",
          notes: instruction.notes ?? "",
          enabled: instruction.enabled,
        }))
      : [
          {
            name: "Bank transfer",
            accountName: "",
            accountReference: "",
            notes: "",
            enabled: true,
          },
        ],
  };
}
