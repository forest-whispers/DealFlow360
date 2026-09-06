// scripts/clear-db.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🗑️ Clearing DealFlow360 database...");

    // Delete transactional/dependent records first
    await prisma.payment.deleteMany();

    await prisma.subscriptionLine.deleteMany();
    await prisma.subscription.deleteMany();

    await prisma.invoiceLine.deleteMany();
    await prisma.invoice.deleteMany();

    await prisma.warehouseAllocation.deleteMany();
    await prisma.fulfillmentLine.deleteMany();
    await prisma.fulfillment.deleteMany();

    await prisma.changeRequest.deleteMany();
    await prisma.negotiationMessage.deleteMany();
    await prisma.negotiation.deleteMany();

    await prisma.approvalStep.deleteMany();
    await prisma.approvalRequest.deleteMany();

    await prisma.quotationLine.deleteMany();
    await prisma.quotationRevision.deleteMany();
    await prisma.quotation.deleteMany();

    await prisma.inventoryItem.deleteMany();

    // Product/warehouse configuration
    await prisma.productVariant.deleteMany();
    await prisma.discountCategoryRule.deleteMany();
    await prisma.discountTierRule.deleteMany();
    await prisma.discountApprovalPolicy.deleteMany();

    await prisma.warehouse.deleteMany();
    await prisma.product.deleteMany();

    // Users and organizations
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();

    console.log("✅ Database completely cleared.");
}

main()
    .catch((error) => {
        console.error("❌ Failed to clear database:");
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });