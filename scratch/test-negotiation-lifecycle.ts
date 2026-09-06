import { prisma } from "@/server/shared/db/prisma";
import { quotationService } from "@/server/modules/quotations/quotation.service";
import { negotiationService } from "@/server/modules/negotiation/negotiation.service";
import { negotiationExecutionService } from "@/server/modules/ai/negotiation/negotiation.execution.service";
import { approvalService } from "@/server/modules/approvals/approval.service";
import {
    ChangeRequestStatus,
    QuotationRevisionStatus,
    QuotationStatus,
    UserRole,
} from "@prisma/client";
import { BadRequestError, ForbiddenError } from "@/server/shared/errors/errors";

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(`ASSERTION FAILED: ${message}`);
    }
}

async function main() {
    console.log("==================================================================");
    console.log("STARTING NEGOTIATION WORKFLOW & INVARIANT REGRESSION TEST SUITE");
    console.log("==================================================================");

    // 1. Resolve test users and product
    const adminUser = await prisma.user.findFirst({
        where: { role: UserRole.ADMIN },
    });
    if (!adminUser) throw new Error("No ADMIN user found");

    const customerUser = await prisma.user.findFirst({
        where: { role: UserRole.CUSTOMER, organizationId: adminUser.organizationId },
    });
    if (!customerUser) throw new Error("No CUSTOMER user found");

    const product = await prisma.product.findFirst({
        where: { organizationId: adminUser.organizationId, isActive: true },
    });
    if (!product) throw new Error("No active product found");

    console.log(`Using Org: ${adminUser.organizationId}`);
    console.log(`Admin User: ${adminUser.email} (${adminUser.id})`);
    console.log(`Customer User: ${customerUser.email} (${customerUser.id})`);
    console.log(`Product: ${product.name} (${product.id})`);

    // 2. Setup Baseline Quotation
    console.log("\n--- Creating Baseline Quotation ---");
    const createdQuote = await quotationService.createQuotation(adminUser as any, {
        customerId: customerUser.id,
    });
    const quoteId = createdQuote.id;
    console.log(`Created Quotation: ${createdQuote.quoteNumber} (ID: ${quoteId})`);

    // Save draft with Line 1: Qty 10, Discount 15%
    await quotationService.saveDraft(adminUser as any, quoteId, {
        lines: [
            {
                productId: product.id,
                lineNumber: 1,
                quantity: 10,
                discountPercent: 15,
            },
        ],
        orderDiscountPercent: 0,
    });

    // Submit Quotation
    const submitted = await quotationService.submitQuotation(adminUser as any, quoteId);
    console.log(`Submitted Quotation Status: ${submitted.status}`);

    // If pending approval, approve it
    if (submitted.status === QuotationStatus.PENDING_APPROVAL) {
        const approvals = await approvalService.getQuotationApprovalHistory(adminUser as any, quoteId);
        for (const req of approvals.approvalRequests) {
            for (let i = 0; i < req.steps.length; i++) {
                await approvalService.approveStep(adminUser as any, req.id, { reason: "Auto-approving for test" });
            }
        }
    }

    // Send Quotation to Customer
    const sentQuote = await quotationService.sendQuotation(adminUser as any, quoteId);
    assert(sentQuote.status === QuotationStatus.SENT, "Quotation must be SENT");
    assert(sentQuote.revision.revisionNumber === 1, "Baseline must be Revision 1");
    assert(sentQuote.revision.lines[0].discountPercent === 15, "Baseline discount must be 15%");
    console.log("Baseline verified: Revision 1, Status SENT, Line 1 Discount: 15%");

    // =========================================================================
    // CASE 1: Customer requests LOWER discount (14%)
    // =========================================================================
    console.log("\n--- CASE 1: Customer requests lower discount (14%) ---");
    await negotiationService.requestCommercialChange(customerUser as any, quoteId, {
        lineNumber: 1,
        discountPercent: 14,
        message: "Can you do 14% discount?",
    });

    // Read canonical internal quotation
    const quoteAfterCase1 = await quotationService.getQuotationById(adminUser as any, quoteId);
    assert(quoteAfterCase1.status === QuotationStatus.UNDER_NEGOTIATION, "Quotation status must be UNDER_NEGOTIATION");
    assert(quoteAfterCase1.revision.revisionNumber === 1, "Active revision MUST REMAIN Revision 1 (no automatic mutation)");
    assert(quoteAfterCase1.revision.lines[0].discountPercent === 15, "Active revision line discount MUST REMAIN 15%");

    // Read portal quotation
    const portalQuoteAfterCase1 = await negotiationService.getCustomerQuotationById(customerUser as any, quoteId);
    assert(portalQuoteAfterCase1.revision.revisionNumber === 1, "Portal revision MUST REMAIN Revision 1");
    assert(portalQuoteAfterCase1.revision.lines[0].discountPercent === 15, "Portal discount MUST REMAIN 15%");

    // Check negotiation history
    const history1 = await negotiationService.getNegotiationHistory(customerUser as any, quoteId);
    const pendingReq1 = history1.changeRequests.find((c) => c.status === ChangeRequestStatus.PENDING);
    assert(!!pendingReq1, "A PENDING ChangeRequest must exist");
    assert(pendingReq1!.discountPercent === 14, "ChangeRequest must record requested 14%");
    console.log("✓ PASS CASE 1: Customer request (14%) recorded as PENDING intent; active quotation remains Revision 1 at 15%");

    // =========================================================================
    // CASE 2: Customer requests HIGHER allowed discount (17%)
    // =========================================================================
    console.log("\n--- CASE 2: Customer requests higher allowed discount (17%) ---");
    await negotiationService.requestCommercialChange(customerUser as any, quoteId, {
        lineNumber: 1,
        discountPercent: 17,
        message: "Actually, can we get 17% discount for our budget?",
    });

    // Read canonical internal quotation
    const quoteAfterCase2 = await quotationService.getQuotationById(adminUser as any, quoteId);
    assert(quoteAfterCase2.status === QuotationStatus.UNDER_NEGOTIATION, "Quotation status must remain UNDER_NEGOTIATION");
    assert(quoteAfterCase2.revision.revisionNumber === 1, "Active revision MUST STILL BE Revision 1");
    assert(quoteAfterCase2.revision.lines[0].discountPercent === 15, "Active revision discount MUST STILL BE 15%");

    // Read portal quotation
    const portalQuoteAfterCase2 = await negotiationService.getCustomerQuotationById(customerUser as any, quoteId);
    assert(portalQuoteAfterCase2.revision.revisionNumber === 1, "Portal revision MUST STILL BE Revision 1");
    assert(portalQuoteAfterCase2.revision.lines[0].discountPercent === 15, "Portal discount MUST STILL BE 15%");
    console.log("✓ PASS CASE 2: Customer request (17%) within ceiling does NOT mutate active quotation (remains Revision 1 at 15%)");

    // =========================================================================
    // CASE 3: Customer requests discount EXCEEDING hard governance ceiling (95%)
    // =========================================================================
    console.log("\n--- CASE 3: Customer requests discount exceeding ceiling (95%) ---");
    let case3Blocked = false;
    try {
        await negotiationService.requestCommercialChange(customerUser as any, quoteId, {
            lineNumber: 1,
            discountPercent: 95,
            message: "Give us 95% off",
        });
    } catch (err) {
        if (err instanceof BadRequestError) {
            case3Blocked = true;
            console.log(`Expected rejection caught: "${err.message}"`);
        }
    }
    assert(case3Blocked, "Request exceeding governance ceiling must be blocked with BadRequestError");

    const quoteAfterCase3 = await quotationService.getQuotationById(adminUser as any, quoteId);
    assert(quoteAfterCase3.revision.revisionNumber === 1, "Active revision MUST STILL BE Revision 1");
    assert(quoteAfterCase3.revision.lines[0].discountPercent === 15, "Active revision discount MUST STILL BE 15%");
    console.log("✓ PASS CASE 3: Excessive discount properly rejected by governance ceiling");

    // =========================================================================
    // Verify Authoritative Pre-Execution Invariant:
    // Before Sales executes, every quotation read MUST return Revision 1 and 15%
    // =========================================================================
    console.log("\n--- Pre-Execution Invariant Verification ---");
    const preExecInternal = await quotationService.getQuotationById(adminUser as any, quoteId);
    const preExecPortal = await negotiationService.getCustomerQuotationById(customerUser as any, quoteId);
    assert(preExecInternal.revision.revisionNumber === 1, "Pre-execution: internal must see Revision 1");
    assert(preExecInternal.revision.lines[0].discountPercent === 15, "Pre-execution: internal must see 15%");
    assert(preExecPortal.revision.revisionNumber === 1, "Pre-execution: portal must see Revision 1");
    assert(preExecPortal.revision.lines[0].discountPercent === 15, "Pre-execution: portal must see 15%");
    console.log("✓ Verified: Both internal and portal strictly observe Revision 1 at 15% prior to sales execution");

    // =========================================================================
    // CASE 4: Internal Sales Proposes Revised Terms (17%) & Sends Rev 2
    // =========================================================================
    console.log("\n--- CASE 4: Internal sales executes revised proposal (17%) ---");
    const execResult = await negotiationExecutionService.executeIntent(adminUser as any, quoteId, {
        sourceRevisionId: preExecInternal.revision.id,
        sourceRevisionNumber: preExecInternal.revision.revisionNumber,
        changes: [
            {
                lineNumber: 1,
                type: "LINE_DISCOUNT",
                discountPercent: 17,
            },
        ],
    });

    assert(execResult.revision.revisionNumber === 2, "Execution must create Revision 2");
    assert(execResult.revision.status === QuotationRevisionStatus.APPROVED || execResult.revision.status === QuotationRevisionStatus.PENDING_APPROVAL, "Revision 2 status check");

    // If pending approval, approve it
    if (execResult.revision.status === QuotationRevisionStatus.PENDING_APPROVAL) {
        const approvals = await approvalService.getQuotationApprovalHistory(adminUser as any, quoteId);
        for (const req of approvals.approvalRequests) {
            if (req.status === "PENDING") {
                for (let i = 0; i < req.steps.length; i++) {
                    await approvalService.approveStep(adminUser as any, req.id, { reason: "Approving Rev 2" });
                }
            }
        }
    }

    // Verify pending change requests were transitioned to ACCEPTED
    const history4 = await negotiationService.getNegotiationHistory(adminUser as any, quoteId);
    const pendingCount = history4.changeRequests.filter((c) => c.status === ChangeRequestStatus.PENDING).length;
    assert(pendingCount === 0, "All pending change requests must be ACCEPTED after sales executes revised proposal");
    console.log("✓ Verified: Pending change requests marked ACCEPTED upon sales revision execution");

    // Send the revised quotation
    const sentQuote2 = await quotationService.sendQuotation(adminUser as any, quoteId);
    assert(sentQuote2.status === QuotationStatus.SENT, "Quotation must be SENT");
    assert(sentQuote2.revision.revisionNumber === 2, "Sent quotation must be Revision 2");
    assert(sentQuote2.revision.lines[0].discountPercent === 17, "Sent revision discount must be 17%");

    // Customer reads portal
    const portalQuoteAfterCase4 = await negotiationService.getCustomerQuotationById(customerUser as any, quoteId);
    assert(portalQuoteAfterCase4.revision.revisionNumber === 2, "Customer now sees Revision 2");
    assert(portalQuoteAfterCase4.revision.lines[0].discountPercent === 17, "Customer now sees effective 17% terms");
    console.log("✓ PASS CASE 4: Internal sales execution created Revision 2 at 17%, accepted pending requests, and delivered via send");

    // =========================================================================
    // CASE 5: Internal Sales Declines Customer Request
    // =========================================================================
    console.log("\n--- CASE 5: Customer requests 19%, Sales declines request ---");
    await negotiationService.requestCommercialChange(customerUser as any, quoteId, {
        lineNumber: 1,
        discountPercent: 19,
        message: "Can we get 19% instead?",
    });

    const history5Before = await negotiationService.getNegotiationHistory(adminUser as any, quoteId);
    const newPendingReq = history5Before.changeRequests.find((c) => c.status === ChangeRequestStatus.PENDING);
    assert(!!newPendingReq, "Pending change request for 19% must exist");

    // Sales declines the request
    await negotiationService.declineChangeRequest(
        adminUser as any,
        quoteId,
        newPendingReq!.id,
        "Cannot accommodate 19% discount for this volume."
    );

    const history5After = await negotiationService.getNegotiationHistory(adminUser as any, quoteId);
    const declinedReq = history5After.changeRequests.find((c) => c.id === newPendingReq!.id);
    assert(declinedReq!.status === ChangeRequestStatus.REJECTED, "Change request must be REJECTED");

    // Verify sales decline message was logged
    const declineMsg = history5After.messages.find((m) => m.message.includes("Cannot accommodate 19%"));
    assert(!!declineMsg, "Decline message must be recorded in negotiation thread");

    // Verify active quotation terms are completely unchanged (Revision 2, 17%)
    const quoteAfterCase5 = await quotationService.getQuotationById(adminUser as any, quoteId);
    assert(quoteAfterCase5.revision.revisionNumber === 2, "Active revision MUST REMAIN Revision 2");
    assert(quoteAfterCase5.revision.lines[0].discountPercent === 17, "Active revision discount MUST REMAIN 17%");
    console.log("✓ PASS CASE 5: Change request declined to REJECTED; active terms preserved at Revision 2, 17%");

    // =========================================================================
    // CASE 6: Customer attempt to authoritatively execute is blocked
    // =========================================================================
    console.log("\n--- CASE 6: Customer attempt to authoritatively execute is blocked ---");
    let customerExecBlocked = false;
    try {
        await negotiationExecutionService.executeIntent(customerUser as any, quoteId, {
            sourceRevisionId: quoteAfterCase5.revision.id,
            sourceRevisionNumber: quoteAfterCase5.revision.revisionNumber,
            changes: [
                {
                    lineNumber: 1,
                    type: "LINE_DISCOUNT",
                    discountPercent: 25,
                },
            ],
        });
    } catch (err) {
        if (err instanceof ForbiddenError) {
            customerExecBlocked = true;
            console.log(`Expected ForbiddenError caught: "${err.message}"`);
        }
    }
    assert(customerExecBlocked, "Customer cannot execute revisions; must throw ForbiddenError");
    console.log("✓ PASS CASE 6: Direct customer authoritative execution blocked with ForbiddenError");

    console.log("\n==================================================================");
    console.log("ALL 6 REGRESSION CASES PASSED PERFECTLY!");
    console.log("==================================================================");
}

main()
    .catch((err) => {
        console.error("TEST RUN ERROR:", err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
