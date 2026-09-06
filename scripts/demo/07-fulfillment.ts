import {
    QuotationStatus,
    FulfillmentStatus,
} from "@prisma/client";
import { prisma } from "@/server/shared/db/prisma";
import { quotationService } from "@/server/modules/quotations/quotation.service";
import { negotiationService } from "@/server/modules/negotiation/negotiation.service";
import { fulfillmentService } from "@/server/modules/fulfillment/fulfillment.service";
import type { DemoActors, DemoProducts, DemoQuotationSummary } from "./types";

export async function seedFulfillments(
    actors: DemoActors,
    products: DemoProducts,
): Promise<DemoQuotationSummary[]> {
    console.log("--> Stage 7: Executing Authoritative Multi-Warehouse Fulfillment & Shortage Scenarios...");

    const summaries: DemoQuotationSummary[] = [];

    // =========================================================================
    // 1. Scenario H: FULFILLED (Multi-Warehouse Allocation Split)
    // Confirmed quotation for 10 units of Server Pro 16C.
    // Pure backend allocation splits: 6 from WH-NORTH + 4 from WH-SOUTH = 10 units (ALLOCATED).
    // Populates /fulfillment and /fulfillment/[id].
    // =========================================================================
    const quoteH = await prisma.quotation.findFirst({
        where: {
            organizationId: actors.admin.organizationId,
            customerId: actors.silverCustomer.id,
            status: QuotationStatus.CONFIRMED,
            fulfillments: {
                some: {
                    status: FulfillmentStatus.ALLOCATED,
                },
            },
        },
        include: {
            revisions: { orderBy: { revisionNumber: "desc" }, take: 1 },
            fulfillments: {
                include: {
                    lines: {
                        include: {
                            allocations: { include: { warehouse: true } },
                        },
                    },
                },
            },
        },
    });

    if (quoteH && quoteH.fulfillments.length > 0) {
        const ful = quoteH.fulfillments[0];
        console.log(`    ✓ [Reused] Scenario H (FULFILLMENT - Multi-Warehouse Split): ${quoteH.quoteNumber} -> Fulfillment: ${ful.fulfillmentNumber}`);
        summaries.push({
            scenario: "DEMO-QUOTE-FULFILLMENT",
            quotationId: quoteH.id,
            quoteNumber: quoteH.quoteNumber,
            customerTier: "SILVER",
            customerEmail: actors.silverCustomer.email,
            status: quoteH.status,
            revisionNumber: quoteH.revisions[0].revisionNumber,
            details: `Fulfilled via Multi-Warehouse Split (${ful.fulfillmentNumber}): 6 from WH-NORTH + 4 from WH-SOUTH`,
        });
    } else {
        // Step 1: Create, save, submit, and send quotation
        const created = await quotationService.createQuotation(actors.salesRep, {
            customerId: actors.silverCustomer.id,
        });

        await quotationService.saveDraft(actors.salesRep, created.id, {
            lines: [
                {
                    productId: products.serverPro.id,
                    variantId: products.serverVariant16C.id,
                    lineNumber: 1,
                    quantity: 10,
                    discountPercent: 0,
                },
            ],
            orderDiscountPercent: 0,
        });

        await quotationService.submitQuotation(actors.salesRep, created.id);
        await quotationService.sendQuotation(actors.salesRep, created.id);

        // Step 2: Customer genuinely confirms the quotation
        await negotiationService.confirmQuotation(actors.silverCustomer, created.id);

        // Step 3: Authoritatively create fulfillment through backend domain engine
        const fulfillment = await fulfillmentService.createFulfillment(actors.admin, {
            quotationId: created.id,
        });

        const allocDetails = fulfillment.lines[0]?.allocations
            .map((a) => `${a.quantity} from ${a.warehouse.code}`)
            .join(" + ");

        console.log(`    ✓ [Created] Scenario H (FULFILLMENT - Multi-Warehouse Split): ${created.quoteNumber} -> ${fulfillment.fulfillmentNumber} (${allocDetails})`);
        summaries.push({
            scenario: "DEMO-QUOTE-FULFILLMENT",
            quotationId: created.id,
            quoteNumber: created.quoteNumber,
            customerTier: "SILVER",
            customerEmail: actors.silverCustomer.email,
            status: QuotationStatus.CONFIRMED,
            revisionNumber: 1,
            details: `Fulfilled via Multi-Warehouse Split (${fulfillment.fulfillmentNumber}): ${allocDetails}`,
        });
    }

    // =========================================================================
    // 2. Bonus Scenario: FULFILLMENT SHORTAGE (Partial Allocation)
    // Confirmed quotation for 5 units of Switch 24P.
    // Stock is 0 (North) + 2 (South) + 1 (East) = 3 available.
    // Result: 3 allocated, 2 short -> status PARTIALLY_ALLOCATED.
    // =========================================================================
    const quoteShortage = await prisma.quotation.findFirst({
        where: {
            organizationId: actors.admin.organizationId,
            customerId: actors.bronzeCustomer.id,
            status: QuotationStatus.CONFIRMED,
            fulfillments: {
                some: {
                    status: FulfillmentStatus.PARTIALLY_ALLOCATED,
                },
            },
        },
        include: {
            revisions: { orderBy: { revisionNumber: "desc" }, take: 1 },
            fulfillments: {
                include: {
                    lines: {
                        include: {
                            allocations: { include: { warehouse: true } },
                        },
                    },
                },
            },
        },
    });

    if (quoteShortage && quoteShortage.fulfillments.length > 0) {
        const ful = quoteShortage.fulfillments[0];
        console.log(`    ✓ [Reused] Scenario Shortage (PARTIALLY_ALLOCATED): ${quoteShortage.quoteNumber} -> Fulfillment: ${ful.fulfillmentNumber}`);
        summaries.push({
            scenario: "DEMO-QUOTE-FULFILLMENT-SHORTAGE",
            quotationId: quoteShortage.id,
            quoteNumber: quoteShortage.quoteNumber,
            customerTier: "BRONZE",
            customerEmail: actors.bronzeCustomer.email,
            status: quoteShortage.status,
            revisionNumber: quoteShortage.revisions[0].revisionNumber,
            details: `Fulfillment shortage (${ful.fulfillmentNumber}): 3 allocated / 5 required (Status: PARTIALLY_ALLOCATED)`,
        });
    } else {
        const created = await quotationService.createQuotation(actors.salesRep, {
            customerId: actors.bronzeCustomer.id,
        });

        await quotationService.saveDraft(actors.salesRep, created.id, {
            lines: [
                {
                    productId: products.switch24P.id,
                    lineNumber: 1,
                    quantity: 5,
                    discountPercent: 0,
                },
            ],
            orderDiscountPercent: 0,
        });

        await quotationService.submitQuotation(actors.salesRep, created.id);
        await quotationService.sendQuotation(actors.salesRep, created.id);
        await negotiationService.confirmQuotation(actors.bronzeCustomer, created.id);

        const fulfillment = await fulfillmentService.createFulfillment(actors.admin, {
            quotationId: created.id,
        });

        console.log(`    ✓ [Created] Scenario Shortage (PARTIALLY_ALLOCATED): ${created.quoteNumber} -> ${fulfillment.fulfillmentNumber} (${fulfillment.totalAllocatedQty}/${fulfillment.totalRequiredQty} units allocated)`);
        summaries.push({
            scenario: "DEMO-QUOTE-FULFILLMENT-SHORTAGE",
            quotationId: created.id,
            quoteNumber: created.quoteNumber,
            customerTier: "BRONZE",
            customerEmail: actors.bronzeCustomer.email,
            status: QuotationStatus.CONFIRMED,
            revisionNumber: 1,
            details: `Fulfillment shortage (${fulfillment.fulfillmentNumber}): ${fulfillment.totalAllocatedQty}/${fulfillment.totalRequiredQty} units allocated (Status: ${fulfillment.status})`,
        });
    }

    return summaries;
}
