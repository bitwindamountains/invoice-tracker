-- CreateEnum
CREATE TYPE "ReminderTone" AS ENUM ('FRIENDLY', 'PROFESSIONAL', 'FIRM');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "ReminderRule" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "offsetDays" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "tone" "ReminderTone" NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceReminder" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "ruleId" TEXT,
    "scheduledDate" DATE,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "tone" "ReminderTone" NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "manual" BOOLEAN NOT NULL DEFAULT false,
    "errorCode" TEXT,
    "attemptedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReminderRule_workspaceId_enabled_offsetDays_idx" ON "ReminderRule"("workspaceId", "enabled", "offsetDays");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderRule_workspaceId_offsetDays_key" ON "ReminderRule"("workspaceId", "offsetDays");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderRule_workspaceId_id_key" ON "ReminderRule"("workspaceId", "id");

-- CreateIndex
CREATE INDEX "InvoiceReminder_workspaceId_invoiceId_createdAt_idx" ON "InvoiceReminder"("workspaceId", "invoiceId", "createdAt");

-- CreateIndex
CREATE INDEX "InvoiceReminder_workspaceId_status_createdAt_idx" ON "InvoiceReminder"("workspaceId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceReminder_invoiceId_ruleId_scheduledDate_key" ON "InvoiceReminder"("invoiceId", "ruleId", "scheduledDate");

-- AddForeignKey
ALTER TABLE "ReminderRule" ADD CONSTRAINT "ReminderRule_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceReminder" ADD CONSTRAINT "InvoiceReminder_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceReminder" ADD CONSTRAINT "InvoiceReminder_workspaceId_invoiceId_fkey" FOREIGN KEY ("workspaceId", "invoiceId") REFERENCES "Invoice"("workspaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceReminder" ADD CONSTRAINT "InvoiceReminder_workspaceId_ruleId_fkey" FOREIGN KEY ("workspaceId", "ruleId") REFERENCES "ReminderRule"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
