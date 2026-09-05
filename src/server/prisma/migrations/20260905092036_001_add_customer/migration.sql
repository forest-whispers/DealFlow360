-- CreateEnum
CREATE TYPE "CustomerTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "customerProfile" JSONB,
ADD COLUMN     "customerTier" "CustomerTier";

-- CreateIndex
CREATE INDEX "User_organizationId_role_customerTier_idx" ON "User"("organizationId", "role", "customerTier");
