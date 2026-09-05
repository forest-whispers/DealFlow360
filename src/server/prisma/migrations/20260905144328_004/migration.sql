-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SENT', 'UNDER_NEGOTIATION', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "QuotationRevisionStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SENT', 'UNDER_NEGOTIATION', 'CONFIRMED');

-- CreateTable
CREATE TABLE "QuotationLine" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "lineNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "lineSubtotal" DECIMAL(12,2) NOT NULL,
    "lineDiscount" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "margin" DECIMAL(12,2) NOT NULL,
    "marginPercent" DECIMAL(7,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotationLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationRevision" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "status" "QuotationRevisionStatus" NOT NULL DEFAULT 'DRAFT',
    "orderDiscountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lineDiscountTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "orderDiscount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "margin" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "marginPercent" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotationRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "customerId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuotationLine_revisionId_idx" ON "QuotationLine"("revisionId");

-- CreateIndex
CREATE INDEX "QuotationLine_productId_idx" ON "QuotationLine"("productId");

-- CreateIndex
CREATE INDEX "QuotationLine_variantId_idx" ON "QuotationLine"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "QuotationLine_revisionId_lineNumber_key" ON "QuotationLine"("revisionId", "lineNumber");

-- CreateIndex
CREATE INDEX "QuotationRevision_quotationId_idx" ON "QuotationRevision"("quotationId");

-- CreateIndex
CREATE INDEX "QuotationRevision_quotationId_status_idx" ON "QuotationRevision"("quotationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "QuotationRevision_quotationId_revisionNumber_key" ON "QuotationRevision"("quotationId", "revisionNumber");

-- CreateIndex
CREATE INDEX "Quotation_organizationId_idx" ON "Quotation"("organizationId");

-- CreateIndex
CREATE INDEX "Quotation_organizationId_status_idx" ON "Quotation"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Quotation_organizationId_customerId_idx" ON "Quotation"("organizationId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_organizationId_quoteNumber_key" ON "Quotation"("organizationId", "quoteNumber");

-- AddForeignKey
ALTER TABLE "QuotationLine" ADD CONSTRAINT "QuotationLine_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "QuotationRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationLine" ADD CONSTRAINT "QuotationLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationLine" ADD CONSTRAINT "QuotationLine_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationRevision" ADD CONSTRAINT "QuotationRevision_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
