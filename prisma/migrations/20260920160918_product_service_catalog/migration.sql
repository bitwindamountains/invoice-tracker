-- CreateTable
CREATE TABLE "ProductService" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "price" DECIMAL(19,4) NOT NULL,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductService_workspaceId_active_name_idx" ON "ProductService"("workspaceId", "active", "name");

-- CreateIndex
CREATE INDEX "ProductService_workspaceId_createdAt_idx" ON "ProductService"("workspaceId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProductService" ADD CONSTRAINT "ProductService_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
