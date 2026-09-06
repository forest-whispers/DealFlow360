import {
    QuotationStatus,
    QuotationRevisionStatus,
    ApprovalRequestStatus,
} from "@prisma/client";
import { prisma } from "@/server/shared/db/prisma";
import { quotationService } from "@/server/modules/quotations/quotation.service";
import { approvalService } from "@/server/modules/approvals/approval.service";
import { negotiationService } from "@/server/modules/negotiation/negotiation.service";
import { negotiationExecutionService } from "@/server/modules/ai/negotiation/negotiation.execution.service";
import type { DemoActors, DemoProducts, DemoQuotationSummary } from "./types";

export async function seedQuotations(
    actors: DemoActors,
    products: DemoProducts,
): Promise<DemoQuotationSummary[]> {
    console.log("--> Stage 6: Progressing Quotations through Authoritative Domain Lifecycles...");

    const summaries: DemoQuotationSummary[] = [];

    // =========================================================================
    // 1. Scenario A: DRAFT Quotation
    // Demonstrates Quotation Builder & In-Progress Pipeline
    // =========================================================================
    const quoteA = await prisma.quotation.findFirst({
        where: {
            organizationId: actors.admin.organizationId,
            customerId: actors.bronzeCustomer.id,
            status: QuotationStatus.DRAFT,
        },
        include: { revisions: { orderBy: { revisionNumber: "desc" }, take: 1 } },
    });

    if (quoteA && quoteA.revisions.length > 0) {
        console.log(`    ✓ [Reused] Scenario A (DRAFT): ${quoteA.quoteNumber}`);
        summaries.push({
            scenario: "DEMO-QUOTE-DRAFT",
            quotationId: quoteA.id,
            quoteNumber: quoteA.quoteNumber,
            customerTier: "BRONZE",
            customerEmail: actors.bronzeCustomer.email,
            status: quoteA.status,
            revisionNumber: quoteA.revisions[0].revisionNumber,
            details: "Unfinished draft with 2x Switch 24P and 1x Consulting (5% disc)",
        });
    } else {
        const created = await quotationService.createQuotation(actors.salesRep, {
            customerId: actors.bronzeCustomer.id,
        });

        const saved = await quotationService.saveDraft(actors.salesRep, created.id, {
            lines: [
                {
                    productId: products.switch24P.id,
                    lineNumber: 1,
                    quantity: 2,
                    discountPercent: 0,
                },
                {
                    productId: products.consultingService.id,
                    lineNumber: 2,
                    quantity: 1,
                    discountPercent: 5,
                },
            ],
            orderDiscountPercent: 0,
        });

        console.log(`    ✓ [Created] Scenario A (DRAFT): ${saved.quoteNumber} (Status: ${saved.status})`);
        summaries.push({
            scenario: "DEMO-QUOTE-DRAFT",
            quotationId: saved.id,
            quoteNumber: saved.quoteNumber,
            customerTier: "BRONZE",
            customerEmail: actors.bronzeCustomer.email,
            status: saved.status,
            revisionNumber: saved.revision.revisionNumber,
            details: "Unfinished draft with 2x Switch 24P and 1x Consulting (5% disc)",
        });
    }

    // =========================================================================
    // 2. Scenario B: PENDING APPROVAL (Sales Manager Threshold)
    // 15% discount on Server Pro 16C (> 10% SM threshold, <= 20% Silver tier limit)
    // =========================================================================
    const quoteB = await prisma.quotation.findFirst({
        where: {
            organizationId: actors.admin.organizationId,
            customerId: actors.silverCustomer.id,
            status: QuotationStatus.PENDING_APPROVAL,
            revisions: {
                some: {
                    lines: {
                        some: {
                            productId: products.serverPro.id,
                            discountPercent: 15,
                        },
                    },
                },
            },
        },
        include: { revisions: { orderBy: { revisionNumber: "desc" }, take: 1 } },
    });

    if (quoteB && quoteB.revisions.length > 0) {
        console.log(`    ✓ [Reused] Scenario B (PENDING_APPROVAL - Sales Manager): ${quoteB.quoteNumber}`);
        summaries.push({
            scenario: "DEMO-QUOTE-SM-APPROVAL",
            quotationId: quoteB.id,
            quoteNumber: quoteB.quoteNumber,
            customerTier: "SILVER",
            customerEmail: actors.silverCustomer.email,
            status: quoteB.status,
            revisionNumber: quoteB.revisions[0].revisionNumber,
            details: "15% discount requires single-step Sales Manager approval",
        });
    } else {
        const created = await quotationService.createQuotation(actors.salesRep, {
            customerId: actors.silverCustomer.id,
        });

        await quotationService.saveDraft(actors.salesRep, created.id, {
            lines: [
                {
                    productId: products.serverPro.id,
                    variantId: products.serverVariant16C.id,
                    lineNumber: 1,
                    quantity: 2,
                    discountPercent: 15,
                },
            ],
            orderDiscountPercent: 0,
        });

        const submitted = await quotationService.submitQuotation(actors.salesRep, created.id);
        console.log(`    ✓ [Created] Scenario B (PENDING_APPROVAL - Sales Manager): ${created.quoteNumber} (Status: ${submitted.status})`);
        summaries.push({
            scenario: "DEMO-QUOTE-SM-APPROVAL",
            quotationId: created.id,
            quoteNumber: created.quoteNumber,
            customerTier: "SILVER",
            customerEmail: actors.silverCustomer.email,
            status: submitted.status,
            revisionNumber: 1,
            details: "15% discount requires single-step Sales Manager approval",
        });
    }

    // =========================================================================
    // 3. Scenario C: FINANCE / MULTI-STEP APPROVAL
    // 25% discount on Server Pro 32C (> 20% Finance threshold, <= 30% Gold tier limit)
    // Routes sequentially: Sales Manager -> Finance Operations
    // =========================================================================
    const quoteC = await prisma.quotation.findFirst({
        where: {
            organizationId: actors.admin.organizationId,
            customerId: actors.goldCustomer.id,
            status: QuotationStatus.PENDING_APPROVAL,
            revisions: {
                some: {
                    lines: {
                        some: {
                            productId: products.serverPro.id,
                            discountPercent: 25,
                        },
                    },
                },
            },
        },
        include: { revisions: { orderBy: { revisionNumber: "desc" }, take: 1 } },
    });

    if (quoteC && quoteC.revisions.length > 0) {
        console.log(`    ✓ [Reused] Scenario C (MULTI_STEP_APPROVAL - SM -> Finance): ${quoteC.quoteNumber}`);
        summaries.push({
            scenario: "DEMO-QUOTE-MULTI-APPROVAL",
            quotationId: quoteC.id,
            quoteNumber: quoteC.quoteNumber,
            customerTier: "GOLD",
            customerEmail: actors.goldCustomer.email,
            status: quoteC.status,
            revisionNumber: quoteC.revisions[0].revisionNumber,
            details: "25% discount triggers sequential chain: Sales Manager -> Finance Operations",
        });
    } else {
        const created = await quotationService.createQuotation(actors.salesRep, {
            customerId: actors.goldCustomer.id,
        });

        await quotationService.saveDraft(actors.salesRep, created.id, {
            lines: [
                {
                    productId: products.serverPro.id,
                    variantId: products.serverVariant32C.id,
                    lineNumber: 1,
                    quantity: 3,
                    discountPercent: 25,
                },
            ],
            orderDiscountPercent: 0,
        });

        const submitted = await quotationService.submitQuotation(actors.salesRep, created.id);
        console.log(`    ✓ [Created] Scenario C (MULTI_STEP_APPROVAL - SM -> Finance): ${created.quoteNumber} (Status: ${submitted.status})`);
        summaries.push({
            scenario: "DEMO-QUOTE-MULTI-APPROVAL",
            quotationId: created.id,
            quoteNumber: created.quoteNumber,
            customerTier: "GOLD",
            customerEmail: actors.goldCustomer.email,
            status: submitted.status,
            revisionNumber: 1,
            details: "25% discount triggers sequential chain: Sales Manager -> Finance Operations",
        });
    }

    // =========================================================================
    // 4. Scenario D: SENT TO CUSTOMER
    // 8% discount on Consulting (< 10% threshold: auto-approved, delivered to portal)
    // =========================================================================
    const quoteD = await prisma.quotation.findFirst({
        where: {
            organizationId: actors.admin.organizationId,
            customerId: actors.goldCustomer.id,
            status: QuotationStatus.SENT,
            revisions: {
                some: {
                    revisionNumber: 1,
                    lines: {
                        some: {
                            productId: products.consultingService.id,
                            discountPercent: 8,
                        },
                    },
                },
            },
            negotiations: { none: {} },
        },
        include: { revisions: { orderBy: { revisionNumber: "desc" }, take: 1 } },
    });

    if (quoteD && quoteD.revisions.length > 0) {
        console.log(`    ✓ [Reused] Scenario D (SENT to Customer Portal): ${quoteD.quoteNumber}`);
        summaries.push({
            scenario: "DEMO-QUOTE-PORTAL-SENT",
            quotationId: quoteD.id,
            quoteNumber: quoteD.quoteNumber,
            customerTier: "GOLD",
            customerEmail: actors.goldCustomer.email,
            status: quoteD.status,
            revisionNumber: quoteD.revisions[0].revisionNumber,
            details: "Auto-approved quotation delivered to Customer Portal for review",
        });
    } else {
        const created = await quotationService.createQuotation(actors.salesRep, {
            customerId: actors.goldCustomer.id,
        });

        await quotationService.saveDraft(actors.salesRep, created.id, {
            lines: [
                {
                    productId: products.consultingService.id,
                    lineNumber: 1,
                    quantity: 2,
                    discountPercent: 8,
                },
            ],
            orderDiscountPercent: 0,
        });

        await quotationService.submitQuotation(actors.salesRep, created.id);
        const sent = await quotationService.sendQuotation(actors.salesRep, created.id);

        console.log(`    ✓ [Created] Scenario D (SENT to Customer Portal): ${sent.quoteNumber} (Status: ${sent.status})`);
        summaries.push({
            scenario: "DEMO-QUOTE-PORTAL-SENT",
            quotationId: sent.id,
            quoteNumber: sent.quoteNumber,
            customerTier: "GOLD",
            customerEmail: actors.goldCustomer.email,
            status: sent.status,
            revisionNumber: sent.revision.revisionNumber,
            details: "Auto-approved quotation delivered to Customer Portal for review",
        });
    }

    // =========================================================================
    // 5. Scenario E: CUSTOMER NEGOTIATION — PENDING REQUEST
    // Baseline terms: 15% discount. Customer requests 18% via portal.
    // Target invariant: Revision 1 remains strictly at 15%, ChangeRequest is PENDING (18%).
    // =========================================================================
    const quoteE = await prisma.quotation.findFirst({
        where: {
            organizationId: actors.admin.organizationId,
            customerId: actors.goldCustomer.id,
            status: QuotationStatus.UNDER_NEGOTIATION,
            revisions: {
                some: {
                    revisionNumber: 1,
                    lines: {
                        some: {
                            productId: products.serverPro.id,
                            discountPercent: 15,
                        },
                    },
                },
            },
        },
        include: { revisions: { orderBy: { revisionNumber: "desc" }, take: 1 } },
    });

    if (quoteE && quoteE.revisions.length > 0) {
        console.log(`    ✓ [Reused] Scenario E (UNDER_NEGOTIATION - Pending Request): ${quoteE.quoteNumber}`);
        summaries.push({
            scenario: "DEMO-QUOTE-NEGOTIATION-PENDING",
            quotationId: quoteE.id,
            quoteNumber: quoteE.quoteNumber,
            customerTier: "GOLD",
            customerEmail: actors.goldCustomer.email,
            status: quoteE.status,
            revisionNumber: quoteE.revisions[0].revisionNumber,
            details: "Active Rev 1 preserved at 15%; customer change request pending at 18%",
        });
    } else {
        const created = await quotationService.createQuotation(actors.salesRep, {
            customerId: actors.goldCustomer.id,
        });

        await quotationService.saveDraft(actors.salesRep, created.id, {
            lines: [
                {
                    productId: products.serverPro.id,
                    variantId: products.serverVariant16C.id,
                    lineNumber: 1,
                    quantity: 4,
                    discountPercent: 15,
                },
            ],
            orderDiscountPercent: 0,
        });

        await quotationService.submitQuotation(actors.salesRep, created.id);

        // Sales Manager approves baseline 15%
        const approvals = await approvalService.getQuotationApprovalHistory(actors.salesManager, created.id);
        for (const req of approvals.approvalRequests) {
            if (req.status === ApprovalRequestStatus.PENDING) {
                for (const step of req.steps) {
                    if (step.status === "PENDING") {
                        await approvalService.approveStep(actors.salesManager, req.id, {
                            reason: "Approved 15% baseline discount for initial enterprise proposal.",
                        });
                    }
                }
            }
        }

        // Deliver baseline to customer
        await quotationService.sendQuotation(actors.salesRep, created.id);

        // Customer submits commercial change request via portal (18%)
        await negotiationService.requestCommercialChange(actors.goldCustomer, created.id, {
            lineNumber: 1,
            discountPercent: 18,
            message: "We are ready to sign if you can accommodate an 18% volume discount to meet our fiscal cap.",
        });

        const finalE = await quotationService.getQuotationById(actors.salesRep, created.id);
        console.log(`    ✓ [Created] Scenario E (UNDER_NEGOTIATION - Pending Request): ${finalE.quoteNumber} (Status: ${finalE.status}, Rev: ${finalE.revision.revisionNumber})`);
        summaries.push({
            scenario: "DEMO-QUOTE-NEGOTIATION-PENDING",
            quotationId: finalE.id,
            quoteNumber: finalE.quoteNumber,
            customerTier: "GOLD",
            customerEmail: actors.goldCustomer.email,
            status: finalE.status,
            revisionNumber: finalE.revision.revisionNumber,
            details: "Active Rev 1 preserved at 15%; customer change request pending at 18%",
        });
    }

    // =========================================================================
    // 6. Scenario F: CUSTOMER NEGOTIATION — SALES COUNTER / REVISED TERMS
    // Baseline: 10%. Customer requests 17%. Sales counters with 14%.
    // Sales executes intent -> Revision 2 created -> SM approves -> Sent.
    // =========================================================================
    const quoteF = await prisma.quotation.findFirst({
        where: {
            organizationId: actors.admin.organizationId,
            customerId: actors.silverCustomer.id,
            revisions: {
                some: {
                    revisionNumber: 2,
                    lines: {
                        some: {
                            productId: products.serverPro.id,
                            discountPercent: 14,
                        },
                    },
                },
            },
        },
        include: { revisions: { orderBy: { revisionNumber: "desc" }, take: 1 } },
    });

    if (quoteF && quoteF.revisions.length > 0) {
        console.log(`    ✓ [Reused] Scenario F (NEGOTIATION COUNTER - Revision 2): ${quoteF.quoteNumber}`);
        summaries.push({
            scenario: "DEMO-QUOTE-NEGOTIATION-COUNTER",
            quotationId: quoteF.id,
            quoteNumber: quoteF.quoteNumber,
            customerTier: "SILVER",
            customerEmail: actors.silverCustomer.email,
            status: quoteF.status,
            revisionNumber: quoteF.revisions[0].revisionNumber,
            details: "Sales executed 14% counter-offer producing authoritative Revision 2",
        });
    } else {
        const created = await quotationService.createQuotation(actors.salesRep, {
            customerId: actors.silverCustomer.id,
        });

        await quotationService.saveDraft(actors.salesRep, created.id, {
            lines: [
                {
                    productId: products.serverPro.id,
                    variantId: products.serverVariant16C.id,
                    lineNumber: 1,
                    quantity: 2,
                    discountPercent: 10,
                },
            ],
            orderDiscountPercent: 0,
        });

        await quotationService.submitQuotation(actors.salesRep, created.id);
        await quotationService.sendQuotation(actors.salesRep, created.id);

        // Customer requests 17% via portal
        await negotiationService.requestCommercialChange(actors.silverCustomer, created.id, {
            lineNumber: 1,
            discountPercent: 17,
            message: "Our budget requires a 17% discount for this quarter.",
        });

        // Sales reviews customer request and executes counter-proposal at 14%
        const preExec = await quotationService.getQuotationById(actors.salesRep, created.id);
        const execResult = await negotiationExecutionService.executeIntent(actors.salesRep, created.id, {
            sourceRevisionId: preExec.revision.id,
            sourceRevisionNumber: preExec.revision.revisionNumber,
            changes: [
                {
                    lineNumber: 1,
                    type: "LINE_DISCOUNT",
                    discountPercent: 14,
                },
            ],
        });

        // If Revision 2 requires approval (14% > 10% SM threshold), approve it
        if (execResult.revision.status === QuotationRevisionStatus.PENDING_APPROVAL) {
            const approvals2 = await approvalService.getQuotationApprovalHistory(actors.salesManager, created.id);
            for (const req of approvals2.approvalRequests) {
                if (req.status === ApprovalRequestStatus.PENDING) {
                    for (const step of req.steps) {
                        if (step.status === "PENDING") {
                            await approvalService.approveStep(actors.salesManager, req.id, {
                                reason: "Approved negotiated counter-proposal at 14%.",
                            });
                        }
                    }
                }
            }
        }

        // Deliver authoritative Revision 2 to customer
        const sentRev2 = await quotationService.sendQuotation(actors.salesRep, created.id);
        console.log(`    ✓ [Created] Scenario F (NEGOTIATION COUNTER - Revision 2): ${sentRev2.quoteNumber} (Status: ${sentRev2.status}, Rev: ${sentRev2.revision.revisionNumber})`);
        summaries.push({
            scenario: "DEMO-QUOTE-NEGOTIATION-COUNTER",
            quotationId: sentRev2.id,
            quoteNumber: sentRev2.quoteNumber,
            customerTier: "SILVER",
            customerEmail: actors.silverCustomer.email,
            status: sentRev2.status,
            revisionNumber: sentRev2.revision.revisionNumber,
            details: "Sales executed 14% counter-offer producing authoritative Revision 2",
        });
    }

    // =========================================================================
    // 7. Scenario G: CONFIRMED + READY FOR FULFILLMENT
    // 10 units Server Pro 16C. Confirmed by customer, ready to fulfill in UI.
    // =========================================================================
    const quoteG = await prisma.quotation.findFirst({
        where: {
            organizationId: actors.admin.organizationId,
            customerId: actors.goldCustomer.id,
            status: QuotationStatus.CONFIRMED,
            fulfillments: { none: {} },
            invoices: { none: {} },
            revisions: {
                some: {
                    lines: {
                        some: {
                            productId: products.serverPro.id,
                            quantity: 10,
                        },
                    },
                },
            },
        },
        include: { revisions: { orderBy: { revisionNumber: "desc" }, take: 1 } },
    });

    if (quoteG && quoteG.revisions.length > 0) {
        console.log(`    ✓ [Reused] Scenario G (CONFIRMED - Ready for Fulfillment): ${quoteG.quoteNumber}`);
        summaries.push({
            scenario: "DEMO-QUOTE-READY-FULFILL",
            quotationId: quoteG.id,
            quoteNumber: quoteG.quoteNumber,
            customerTier: "GOLD",
            customerEmail: actors.goldCustomer.email,
            status: quoteG.status,
            revisionNumber: quoteG.revisions[0].revisionNumber,
            details: "10x Server Pro confirmed; ready for manual fulfillment creation in UI",
        });
    } else {
        const created = await quotationService.createQuotation(actors.salesRep, {
            customerId: actors.goldCustomer.id,
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

        // Customer confirms quotation
        await negotiationService.confirmQuotation(actors.goldCustomer, created.id);

        const finalG = await quotationService.getQuotationById(actors.salesRep, created.id);
        console.log(`    ✓ [Created] Scenario G (CONFIRMED - Ready for Fulfillment): ${finalG.quoteNumber} (Status: ${finalG.status})`);
        summaries.push({
            scenario: "DEMO-QUOTE-READY-FULFILL",
            quotationId: finalG.id,
            quoteNumber: finalG.quoteNumber,
            customerTier: "GOLD",
            customerEmail: actors.goldCustomer.email,
            status: finalG.status,
            revisionNumber: finalG.revision.revisionNumber,
            details: "10x Server Pro confirmed; ready for manual fulfillment creation in UI",
        });
    }

    return summaries;
}
