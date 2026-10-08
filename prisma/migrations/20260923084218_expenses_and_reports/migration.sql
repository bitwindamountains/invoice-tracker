-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" TEXT NOT NULL,
    "incurredOn" DATE NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpenseCategory_workspaceId_active_name_idx" ON "ExpenseCategory"("workspaceId", "active", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_workspaceId_name_key" ON "ExpenseCategory"("workspaceId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_workspaceId_id_key" ON "ExpenseCategory"("workspaceId", "id");

-- CreateIndex
CREATE INDEX "Expense_workspaceId_incurredOn_id_idx" ON "Expense"("workspaceId", "incurredOn", "id");

-- CreateIndex
CREATE INDEX "Expense_workspaceId_categoryId_incurredOn_idx" ON "Expense"("workspaceId", "categoryId", "incurredOn");

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_workspaceId_categoryId_fkey" FOREIGN KEY ("workspaceId", "categoryId") REFERENCES "ExpenseCategory"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
