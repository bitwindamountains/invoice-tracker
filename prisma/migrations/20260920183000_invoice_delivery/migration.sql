CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');
ALTER TABLE "Invoice" ADD COLUMN "emailSentAt" TIMESTAMP(3), ADD COLUMN "issueSnapshot" JSONB,
ADD COLUMN "issuedAt" TIMESTAMP(3), ADD COLUMN "publicTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN "publicTokenHash" TEXT, ADD COLUMN "publicTokenRevokedAt" TIMESTAMP(3);
CREATE TABLE "InvoiceEvent" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "invoiceId" TEXT NOT NULL,
  "type" TEXT NOT NULL, "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InvoiceEvent_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "InvoiceDelivery" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "invoiceId" TEXT NOT NULL,
  "recipient" TEXT NOT NULL, "subject" TEXT NOT NULL, "message" TEXT NOT NULL,
  "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING', "errorCode" TEXT,
  "attemptedAt" TIMESTAMP(3), "sentAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "InvoiceDelivery_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InvoiceEvent_workspaceId_invoiceId_createdAt_idx" ON "InvoiceEvent"("workspaceId", "invoiceId", "createdAt");
CREATE INDEX "InvoiceDelivery_workspaceId_invoiceId_createdAt_idx" ON "InvoiceDelivery"("workspaceId", "invoiceId", "createdAt");
CREATE INDEX "InvoiceDelivery_status_createdAt_idx" ON "InvoiceDelivery"("status", "createdAt");
CREATE UNIQUE INDEX "Invoice_publicTokenHash_key" ON "Invoice"("publicTokenHash");
ALTER TABLE "InvoiceEvent" ADD CONSTRAINT "InvoiceEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceEvent" ADD CONSTRAINT "InvoiceEvent_workspaceId_invoiceId_fkey" FOREIGN KEY ("workspaceId", "invoiceId") REFERENCES "Invoice"("workspaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceDelivery" ADD CONSTRAINT "InvoiceDelivery_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceDelivery" ADD CONSTRAINT "InvoiceDelivery_workspaceId_invoiceId_fkey" FOREIGN KEY ("workspaceId", "invoiceId") REFERENCES "Invoice"("workspaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
