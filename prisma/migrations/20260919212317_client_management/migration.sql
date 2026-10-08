-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "provinceState" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "taxId" TEXT,
    "currency" TEXT,
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Client_workspaceId_archivedAt_name_idx" ON "Client"("workspaceId", "archivedAt", "name");

-- CreateIndex
CREATE INDEX "Client_workspaceId_createdAt_idx" ON "Client"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "Client_workspaceId_email_idx" ON "Client"("workspaceId", "email");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
