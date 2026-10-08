-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "defaultCurrency" TEXT NOT NULL DEFAULT 'PHP',
ADD COLUMN     "invoicePrefix" TEXT NOT NULL DEFAULT 'INV-',
ADD COLUMN     "nextInvoiceNumber" INTEGER NOT NULL DEFAULT 1001,
ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Manila';

-- CreateTable
CREATE TABLE "BusinessProfile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "legalName" TEXT,
    "ownerName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "provinceState" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL,
    "website" TEXT,
    "brandColor" TEXT NOT NULL DEFAULT '#285D45',
    "logoData" BYTEA,
    "logoMimeType" TEXT,
    "invoiceFooter" TEXT,
    "defaultPaymentTermsDays" INTEGER NOT NULL DEFAULT 30,
    "defaultNotes" TEXT,
    "defaultTaxLabel" TEXT NOT NULL DEFAULT 'Tax',
    "defaultTaxRate" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentInstruction" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountName" TEXT,
    "accountReference" TEXT,
    "notes" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentInstruction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessProfile_workspaceId_key" ON "BusinessProfile"("workspaceId");

-- CreateIndex
CREATE INDEX "PaymentInstruction_workspaceId_sortOrder_idx" ON "PaymentInstruction"("workspaceId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentInstruction_workspaceId_name_key" ON "PaymentInstruction"("workspaceId", "name");

-- AddForeignKey
ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentInstruction" ADD CONSTRAINT "PaymentInstruction_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
