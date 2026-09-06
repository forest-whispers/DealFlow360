import { prisma } from "../src/server/shared/db/prisma";

async function main() {
    const totalWarehouses = await prisma.warehouse.count();
    console.log("Total warehouses across DB:", totalWarehouses);

    const totalFulfillments = await prisma.fulfillment.count();
    console.log("Total fulfillments across DB:", totalFulfillments);

    const users = await prisma.user.findMany({
        select: { id: true, email: true, role: true, organizationId: true },
    });
    console.log("Users:", users);

    const quotations = await prisma.quotation.findMany({
        select: { id: true, quoteNumber: true, status: true, organizationId: true },
    });
    console.log("Quotations:", quotations);
}

main().catch(console.error).finally(() => prisma.$disconnect());
