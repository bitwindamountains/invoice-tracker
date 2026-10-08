CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'VOID');
CREATE TYPE "DiscountType" AS ENUM ('NONE', 'PERCENT', 'FIXED');
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "clientId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL, "issueDate" DATE NOT NULL, "dueDate" DATE NOT NULL,
    "currency" TEXT NOT NULL, "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "clientName" TEXT NOT NULL, "clientCompany" TEXT, "clientEmail" TEXT NOT NULL, "clientAddress" TEXT,
    "subtotal" DECIMAL(19,4) NOT NULL, "discountTotal" DECIMAL(19,4) NOT NULL,
    "taxTotal" DECIMAL(19,4) NOT NULL, "total" DECIMAL(19,4) NOT NULL,
    "amountPaid" DECIMAL(19,4) NOT NULL DEFAULT 0, "balanceDue" DECIMAL(19,4) NOT NULL,
    "notes" TEXT, "terms" TEXT, "paymentInstructions" TEXT, "calculationVersion" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 1, "createdBy" TEXT NOT NULL, "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3), "voidedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL, "unit" TEXT NOT NULL, "quantity" DECIMAL(15,4) NOT NULL,
    "unitPrice" DECIMAL(19,4) NOT NULL, "discountType" "DiscountType" NOT NULL DEFAULT 'NONE',
    "discountValue" DECIMAL(19,4) NOT NULL DEFAULT 0, "taxRate" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(19,4) NOT NULL, "discountAmount" DECIMAL(19,4) NOT NULL,
    "taxAmount" DECIMAL(19,4) NOT NULL, "lineTotal" DECIMAL(19,4) NOT NULL,
    "sortOrder" INTEGER NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Invoice_workspaceId_status_issueDate_idx" ON "Invoice"("workspaceId", "status", "issueDate");
CREATE INDEX "Invoice_workspaceId_clientId_idx" ON "Invoice"("workspaceId", "clientId");
CREATE UNIQUE INDEX "Invoice_workspaceId_invoiceNumber_key" ON "Invoice"("workspaceId", "invoiceNumber");
CREATE UNIQUE INDEX "Invoice_workspaceId_id_key" ON "Invoice"("workspaceId", "id");
CREATE INDEX "InvoiceItem_workspaceId_invoiceId_sortOrder_idx" ON "InvoiceItem"("workspaceId", "invoiceId", "sortOrder");
CREATE UNIQUE INDEX "Client_workspaceId_id_key" ON "Client"("workspaceId", "id");
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_workspaceId_clientId_fkey" FOREIGN KEY ("workspaceId", "clientId") REFERENCES "Client"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_workspaceId_invoiceId_fkey" FOREIGN KEY ("workspaceId", "invoiceId") REFERENCES "Invoice"("workspaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
