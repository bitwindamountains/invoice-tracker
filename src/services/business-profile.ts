import { Prisma } from "@/generated/prisma/client";
import { getDatabase } from "@/lib/db";
import {
  onboardingSchema,
  type OnboardingValues,
} from "@/features/onboarding/schema";

const MAX_LOGO_BYTES = 512 * 1024;
const logoSignatures: Record<string, (bytes: Uint8Array) => boolean> = {
  "image/png": (bytes) =>
    bytes.length >= 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every(
      (value, index) => bytes[index] === value,
    ),
  "image/jpeg": (bytes) =>
    bytes.length >= 3 &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255,
  "image/webp": (bytes) =>
    bytes.length >= 12 &&
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP",
};

export class InvalidLogo extends Error {}

function decodeLogo(
  dataUrl: string | null,
): { bytes: Uint8Array<ArrayBuffer>; mimeType: string } | null {
  if (!dataUrl) return null;
  const match =
    /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new InvalidLogo("Use a PNG, JPEG, or WebP logo.");
  const decoded = Buffer.from(match[2], "base64");
  const bytes = new Uint8Array(decoded.length);
  bytes.set(decoded);
  if (
    !bytes.length ||
    bytes.length > MAX_LOGO_BYTES ||
    !logoSignatures[match[1]]?.(bytes)
  )
    throw new InvalidLogo(
      "Logo must be a valid PNG, JPEG, or WebP under 512 KB.",
    );
  return { bytes, mimeType: match[1] };
}

export async function saveBusinessProfile(
  userId: string,
  workspaceId: string,
  rawInput: unknown,
) {
  const input = onboardingSchema.parse(rawInput);
  const logo = decodeLogo(input.logoDataUrl);
  const database = getDatabase();
  const existing = await database.businessProfile.findUnique({
    where: { workspaceId },
    select: { id: true },
  });
  return database.$transaction(
    async (transaction) => {
      const workspace = await transaction.workspace.findFirst({
        where: {
          id: workspaceId,
          members: { some: { userId, role: { in: ["OWNER", "ADMIN"] } } },
        },
        select: { id: true, onboardingCompletedAt: true },
      });
      if (!workspace) throw new Error("Workspace not found");
      const logoUpdate = logo
        ? { logoData: logo.bytes, logoMimeType: logo.mimeType }
        : input.removeLogo
          ? { logoData: null, logoMimeType: null }
          : {};
      await transaction.workspace.update({
        where: { id: workspaceId },
        data: {
          name: input.businessName,
          defaultCurrency: input.defaultCurrency,
          timezone: input.timezone,
          invoicePrefix: input.invoicePrefix,
          nextInvoiceNumber: input.startingInvoiceNumber,
          onboardingCompletedAt: workspace.onboardingCompletedAt ?? new Date(),
        },
      });
      const businessProfile = profileData(input, logoUpdate);
      await transaction.businessProfile.upsert({
        where: { workspaceId },
        create: {
          ...businessProfile,
          workspace: { connect: { id: workspaceId } },
        },
        update: businessProfile,
      });
      await transaction.paymentInstruction.deleteMany({
        where: { workspaceId },
      });
      await transaction.paymentInstruction.createMany({
        data: input.paymentInstructions.map((instruction, sortOrder) => ({
          workspaceId,
          ...instruction,
          sortOrder,
        })),
      });
      await transaction.auditLog.create({
        data: {
          workspaceId,
          actorId: userId,
          action: existing
            ? "BUSINESS_SETTINGS_UPDATED"
            : "ONBOARDING_COMPLETED",
        },
      });
      return { workspaceId };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

function profileData(
  input: OnboardingValues,
  logo: {
    logoData?: Uint8Array<ArrayBuffer> | null;
    logoMimeType?: string | null;
  },
) {
  return {
    displayName: input.businessName,
    legalName: input.legalName,
    ownerName: input.ownerName,
    email: input.businessEmail,
    phone: input.phone,
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2,
    city: input.city,
    provinceState: input.provinceState,
    postalCode: input.postalCode,
    country: input.country,
    website: input.website,
    brandColor: input.brandColor,
    invoiceFooter: input.invoiceFooter,
    defaultPaymentTermsDays: input.defaultPaymentTermsDays,
    defaultNotes: input.defaultNotes,
    defaultTaxLabel: input.defaultTaxLabel,
    defaultTaxRate: new Prisma.Decimal(input.defaultTaxRate),
    ...logo,
  };
}
