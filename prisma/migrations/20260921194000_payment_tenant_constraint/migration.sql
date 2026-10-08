-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_paymentConfirmationId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "Payment_workspaceId_paymentConfirmationId_key" ON "Payment"("workspaceId", "paymentConfirmationId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentConfirmation_workspaceId_id_key" ON "PaymentConfirmation"("workspaceId", "id");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_workspaceId_paymentConfirmationId_fkey" FOREIGN KEY ("workspaceId", "paymentConfirmationId") REFERENCES "PaymentConfirmation"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
