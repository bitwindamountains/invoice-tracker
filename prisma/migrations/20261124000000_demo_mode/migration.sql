-- AlterTable
ALTER TABLE "User" ADD COLUMN     "demoTokenHash" TEXT;

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "demoExpiresAt" TIMESTAMPTZ(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_demoTokenHash_key" ON "User"("demoTokenHash");


-- Speeds up the demo cleanup sweep.
CREATE INDEX "Workspace_demoExpiresAt_idx" ON "Workspace" ("demoExpiresAt") WHERE "demoExpiresAt" IS NOT NULL;
