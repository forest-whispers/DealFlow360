-- CreateTable
CREATE TABLE "DiscountTierRule" (
    "id" TEXT NOT NULL,
    "customerTier" "CustomerTier" NOT NULL,
    "maximumDiscountPercent" DECIMAL(5,2) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountTierRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountCategoryRule" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "maximumDiscountPercent" DECIMAL(5,2) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountCategoryRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountApprovalPolicy" (
    "id" TEXT NOT NULL,
    "salesManagerThreshold" DECIMAL(5,2) NOT NULL,
    "financeOperationsThreshold" DECIMAL(5,2) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountApprovalPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiscountTierRule_organizationId_isActive_idx" ON "DiscountTierRule"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountTierRule_organizationId_customerTier_key" ON "DiscountTierRule"("organizationId", "customerTier");

-- CreateIndex
CREATE INDEX "DiscountCategoryRule_organizationId_isActive_idx" ON "DiscountCategoryRule"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCategoryRule_organizationId_category_key" ON "DiscountCategoryRule"("organizationId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountApprovalPolicy_organizationId_key" ON "DiscountApprovalPolicy"("organizationId");

-- AddForeignKey
ALTER TABLE "DiscountTierRule" ADD CONSTRAINT "DiscountTierRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountCategoryRule" ADD CONSTRAINT "DiscountCategoryRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountApprovalPolicy" ADD CONSTRAINT "DiscountApprovalPolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
