import { prisma } from "../src/server/shared/db/prisma";
import { fulfillmentService } from "../src/server/modules/fulfillment/fulfillment.service";
import { warehouseService } from "../src/server/modules/warehouses/warehouse.service";
import { quotationService } from "../src/server/modules/quotations/quotation.service";
import { negotiationService } from "../src/server/modules/negotiation/negotiation.service";
import { QuotationStatus, QuotationRevisionStatus, UserRole, WarehouseStatus } from "@prisma/client";
import { BadRequestError, ConflictError } from "../src/server/shared/errors/errors";

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(`[ASSERTION FAILED]: ${message}`);
    }
}

async function main() {
    console.log("==================================================================");
    console.log("PHASE 8: FULFILLMENT & WAREHOUSE WORKSPACE E2E VERIFICATION SUITE");
    console.log("==================================================================");

    // 1. Locate Admin User and Org
    const adminUser = await prisma.user.findFirst({
        where: { role: UserRole.ADMIN },
    });
    if (!adminUser) throw new Error("No ADMIN user found in DB");

    const orgId = adminUser.organizationId;
    console.log(`Using Org: ${orgId}, Admin: ${adminUser.email}`);

    // Resolve or create Customer User
    let customerUser = await prisma.user.findFirst({
        where: { role: UserRole.CUSTOMER, organizationId: orgId },
    });
    if (!customerUser) {
        customerUser = await prisma.user.create({
            data: {
                organizationId: orgId,
                email: `test-fulfillment-customer-${Date.now()}@example.com`,
                name: "Fulfillment Test Customer",
                passwordHash: "hash",
                role: UserRole.CUSTOMER,
            },
        });
    }

    // Resolve or create Active Product
    let product = await prisma.product.findFirst({
        where: { organizationId: orgId, isActive: true },
    });
    if (!product) {
        product = await prisma.product.create({
            data: {
                organizationId: orgId,
                name: "Industrial Server Rack Pro",
                basePrice: 1000,
                costPrice: 600,
                category: "Hardware",
                isActive: true,
            },
        });
    }
    console.log(`Product: ${product.name} (ID: ${product.id})`);

    // 2. Setup Warehouses and Inventory for Multi-Warehouse Split Demonstration
    console.log("\n--- Setting Up Warehouses & Inventory ---");
    let whNorth = await prisma.warehouse.findFirst({
        where: { organizationId: orgId, code: "WH-NORTH" },
    });
    if (!whNorth) {
        whNorth = await prisma.warehouse.create({
            data: {
                organizationId: orgId,
                name: "Northern Logistics Center",
                code: "WH-NORTH",
                priority: 1,
                status: WarehouseStatus.ACTIVE,
            },
        });
    }

    let whSouth = await prisma.warehouse.findFirst({
        where: { organizationId: orgId, code: "WH-SOUTH" },
    });
    if (!whSouth) {
        whSouth = await prisma.warehouse.create({
            data: {
                organizationId: orgId,
                name: "Southern Regional Hub",
                code: "WH-SOUTH",
                priority: 2,
                status: WarehouseStatus.ACTIVE,
            },
        });
    }

    // Seed stock: WH-NORTH has 6 units, WH-SOUTH has 10 units
    const existingNorth = await prisma.inventoryItem.findFirst({
        where: { warehouseId: whNorth.id, productId: product.id },
    });
    if (existingNorth) {
        await prisma.inventoryItem.update({
            where: { id: existingNorth.id },
            data: { availableQty: 6 },
        });
    } else {
        await prisma.inventoryItem.create({
            data: {
                warehouseId: whNorth.id,
                productId: product.id,
                availableQty: 6,
            },
        });
    }

    const existingSouth = await prisma.inventoryItem.findFirst({
        where: { warehouseId: whSouth.id, productId: product.id },
    });
    if (existingSouth) {
        await prisma.inventoryItem.update({
            where: { id: existingSouth.id },
            data: { availableQty: 10 },
        });
    } else {
        await prisma.inventoryItem.create({
            data: {
                warehouseId: whSouth.id,
                productId: product.id,
                availableQty: 10,
            },
        });
    }

    console.log(`Configured Facilities:`);
    console.log(`  - ${whNorth.name} (${whNorth.code}, Priority ${whNorth.priority}): 6 units`);
    console.log(`  - ${whSouth.name} (${whSouth.code}, Priority ${whSouth.priority}): 10 units`);

    // 3. Test Warehouses Read API
    console.log("\n--- Testing Warehouses & Inventory Read-Only APIs ---");
    const warehouseList = await warehouseService.listWarehouses(adminUser as any, {});
    assert(warehouseList.warehouses.length >= 2, "Warehouse list returns configured facilities");
    console.log(`✓ GET /api/warehouses returned ${warehouseList.warehouses.length} warehouses`);

    const invNorth = await warehouseService.listWarehouseInventory(adminUser as any, whNorth.id, {});
    const itemNorth = invNorth.inventory.find((i) => i.productId === product.id);
    assert(itemNorth !== undefined && itemNorth.availableQty === 6, "WH-NORTH inventory shows 6 available units");
    console.log(`✓ GET /api/warehouses/${whNorth.id}/inventory returned expected available stock`);

    // 4. Test Invariant: Fulfillment on Non-Confirmed Quotation Must Fail
    console.log("\n--- Testing Invariant: Non-Confirmed Quotation Rejection ---");
    const draftQuote = await quotationService.createQuotation(adminUser as any, {
        customerId: customerUser.id,
    });
    let rejectedNonConfirmed = false;
    try {
        await fulfillmentService.createFulfillment(adminUser as any, {
            quotationId: draftQuote.id,
        });
    } catch (err: any) {
        rejectedNonConfirmed = true;
        assert(err instanceof BadRequestError, "Rejected with BadRequestError");
        console.log(`✓ Correctly rejected fulfillment creation on DRAFT quote: "${err.message}"`);
    }
    assert(rejectedNonConfirmed, "Non-confirmed quotation was blocked from fulfillment");

    // 5. Create, Deliver, and Confirm a Quotation Requiring 10 Units
    // (This deterministically triggers a Multi-Warehouse Split: 6 from Priority 1 WH-NORTH, 4 from Priority 2 WH-SOUTH)
    console.log("\n--- Creating Confirmed Quotation Requiring 10 Units ---");
    const quote = await quotationService.createQuotation(adminUser as any, {
        customerId: customerUser.id,
    });

    await quotationService.saveDraft(adminUser as any, quote.id, {
        lines: [
            {
                productId: product.id,
                lineNumber: 1,
                quantity: 10,
                discountPercent: 0,
            },
        ],
        orderDiscountPercent: 0,
    });

    // Submit Quotation (0% discount is approved immediately)
    await quotationService.submitQuotation(adminUser as any, quote.id);

    // Deliver Quotation to customer
    await quotationService.sendQuotation(adminUser as any, quote.id);

    // Confirm Quotation via customer portal confirmation
    await negotiationService.confirmQuotation(customerUser as any, quote.id);

    const confirmedQuote = await quotationService.getQuotationById(adminUser as any, quote.id);
    assert(confirmedQuote.status === QuotationStatus.CONFIRMED, "Quotation is in CONFIRMED status");
    assert(confirmedQuote.revision.status === QuotationRevisionStatus.CONFIRMED, "Latest revision is in CONFIRMED status");
    console.log(`✓ Quotation ${confirmedQuote.quoteNumber} confirmed successfully (Status: ${confirmedQuote.status}, Revision: ${confirmedQuote.revision.status})`);

    // 6. Test Fulfillment Creation & Authoritative Multi-Warehouse Allocation Split
    console.log("\n--- Testing Fulfillment Creation & Authoritative Allocation Split ---");
    const fulfillment = await fulfillmentService.createFulfillment(adminUser as any, {
        quotationId: quote.id,
    });

    console.log(`Created Fulfillment: ${fulfillment.fulfillmentNumber} (ID: ${fulfillment.id})`);
    assert(fulfillment.fulfillmentNumber.startsWith("FUL-"), "Fulfillment number format starts with FUL-");
    assert(fulfillment.status === "ALLOCATED", "Status is ALLOCATED");
    assert(fulfillment.totalRequiredQty === 10, "Total required quantity is 10");
    assert(fulfillment.totalAllocatedQty === 10, "Total allocated quantity is 10");
    assert(fulfillment.lines.length === 1, "Contains 1 fulfillment line item");

    const line = fulfillment.lines[0];
    assert(line.requiredQty === 10, "Line required quantity is 10");
    assert(line.allocatedQty === 10, "Line allocated quantity is 10");
    assert(line.status === "ALLOCATED", "Line status is ALLOCATED");
    assert(line.allocations.length === 2, "DEMO-CRITICAL: Authoritative Multi-Warehouse Split has exactly 2 warehouse allocations");

    // Sourced breakdown:
    const allocNorth = line.allocations.find((a) => a.warehouse.code === "WH-NORTH");
    const allocSouth = line.allocations.find((a) => a.warehouse.code === "WH-SOUTH");
    assert(allocNorth !== undefined, "Line has allocation from WH-NORTH");
    assert(allocSouth !== undefined, "Line has allocation from WH-SOUTH");
    assert(allocNorth!.quantity === 6, "WH-NORTH supplied 6 units (priority 1 max capacity)");
    assert(allocSouth!.quantity === 4, "WH-SOUTH supplied 4 units (priority 2 overflow)");

    console.log("✓ Authoritative Multi-Warehouse Split Verified:");
    console.log(`    * [${allocNorth!.warehouse.code}] ${allocNorth!.warehouse.name} (Priority ${allocNorth!.warehouse.priority}): ${allocNorth!.quantity} units`);
    console.log(`    * [${allocSouth!.warehouse.code}] ${allocSouth!.warehouse.name} (Priority ${allocSouth!.warehouse.priority}): ${allocSouth!.quantity} units`);
    console.log(`    * Total: ${allocNorth!.quantity + allocSouth!.quantity} / 10 units (100% fulfilled)`);

    // 7. Test Invariant: Duplicate Fulfillment Prevention (Single Fulfillment Constraint)
    console.log("\n--- Testing Invariant: Duplicate Fulfillment Prevention ---");
    let duplicateRejected = false;
    try {
        await fulfillmentService.createFulfillment(adminUser as any, {
            quotationId: quote.id,
        });
    } catch (err: any) {
        duplicateRejected = true;
        assert(err instanceof ConflictError, "Rejected with ConflictError");
        assert(err.message.includes("already exists"), "Rejection message confirms existing fulfillment");
        console.log(`✓ Correctly rejected duplicate fulfillment creation: "${err.message}"`);
    }
    assert(duplicateRejected, "Duplicate fulfillment was blocked by backend concurrency & uniqueness check");

    // 8. Test Fulfillment Detail & List APIs
    console.log("\n--- Testing Fulfillment Query APIs ---");
    const fetchedById = await fulfillmentService.getFulfillmentById(adminUser as any, fulfillment.id);
    assert(fetchedById.id === fulfillment.id, "getFulfillmentById returns the exact record");
    assert(fetchedById.lines[0].allocations.length === 2, "getFulfillmentById preserves authoritative allocations");
    console.log(`✓ GET /api/fulfillments/${fulfillment.id} verified`);

    const queueList = await fulfillmentService.listFulfillments(adminUser as any, { page: 1, limit: 20 });
    const foundInQueue = queueList.fulfillments.find((f) => f.id === fulfillment.id);
    assert(foundInQueue !== undefined, "Fulfillment appears in operational queue list");
    assert(foundInQueue!.quotationNumber === confirmedQuote.quoteNumber, "Queue item references confirmed quotation number");
    assert(foundInQueue!.totalAllocatedQty === 10, "Queue item shows total allocated units");
    console.log(`✓ GET /api/fulfillments contains newly created fulfillment in queue`);

    console.log("\n==================================================================");
    console.log("ALL PHASE 8 FULFILLMENT & WAREHOUSE INVARIANTS VERIFIED SUCCESSFULLY!");
    console.log("==================================================================");
}

main()
    .catch((err) => {
        console.error("TEST RUNNER ERROR:", err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
