import { prisma } from "@/server/shared/db/prisma";
import { DEMO_ORG } from "./constants";

/**
 * Opt-in scoped cleanup helper.
 * STRICT SAFETY INVARIANT: Only purges records belonging to the "dealflow-demo" organization.
 * Never touches production data or records belonging to other organizations.
 */
export async function cleanupDemoOrganization(): Promise<void> {
    console.log(`\n[CLEANUP MODE] Scoped cleanup initiated for demo tenant: "${DEMO_ORG.slug}"...`);

    const org = await prisma.organization.findUnique({
        where: { slug: DEMO_ORG.slug },
        select: { id: true },
    });

    if (!org) {
        console.log("  -> Demo organization does not exist. Nothing to clean.");
        return;
    }

    const orgId = org.id;

    // Delete in reverse dependency order within demo organization
    // 1. Payments
    const delPayments = await prisma.payment.deleteMany({
        where: { invoice: { organizationId: orgId } },
    });
    console.log(`  ✓ Removed ${delPayments.count} demo payments`);

    // 2. Invoice Lines & Invoices
    const delInvLines = await prisma.invoiceLine.deleteMany({
        where: { invoice: { organizationId: orgId } },
    });
    const delInvoices = await prisma.invoice.deleteMany({
        where: { organizationId: orgId },
    });
    console.log(`  ✓ Removed ${delInvoices.count} demo invoices (${delInvLines.count} lines)`);

    // 3. Subscription Lines & Subscriptions
    const delSubLines = await prisma.subscriptionLine.deleteMany({
        where: { subscription: { organizationId: orgId } },
    });
    const delSubs = await prisma.subscription.deleteMany({
        where: { organizationId: orgId },
    });
    console.log(`  ✓ Removed ${delSubs.count} demo subscriptions (${delSubLines.count} lines)`);

    // 4. Warehouse Allocations & Fulfillment Lines & Fulfillments
    const delAlloc = await prisma.warehouseAllocation.deleteMany({
        where: { warehouse: { organizationId: orgId } },
    });
    const delFulLines = await prisma.fulfillmentLine.deleteMany({
        where: { fulfillment: { organizationId: orgId } },
    });
    const delFulfillments = await prisma.fulfillment.deleteMany({
        where: { organizationId: orgId },
    });
    console.log(`  ✓ Removed ${delFulfillments.count} demo fulfillments (${delFulLines.count} lines, ${delAlloc.count} allocations)`);

    // 5. Change Requests & Negotiation Messages & Negotiations
    const delChangeReqs = await prisma.changeRequest.deleteMany({
        where: { negotiation: { quotation: { organizationId: orgId } } },
    });
    const delMessages = await prisma.negotiationMessage.deleteMany({
        where: { negotiation: { quotation: { organizationId: orgId } } },
    });
    const delNegotiations = await prisma.negotiation.deleteMany({
        where: { quotation: { organizationId: orgId } },
    });
    console.log(`  ✓ Removed ${delNegotiations.count} demo negotiations (${delMessages.count} messages, ${delChangeReqs.count} change requests)`);

    // 6. Approval Steps & Approval Requests
    const delSteps = await prisma.approvalStep.deleteMany({
        where: { approvalRequest: { quotation: { organizationId: orgId } } },
    });
    const delApprovalReqs = await prisma.approvalRequest.deleteMany({
        where: { quotation: { organizationId: orgId } },
    });
    console.log(`  ✓ Removed ${delApprovalReqs.count} demo approval requests (${delSteps.count} steps)`);

    // 7. Quotation Lines & Quotation Revisions & Quotations
    const delQuoteLines = await prisma.quotationLine.deleteMany({
        where: { revision: { quotation: { organizationId: orgId } } },
    });
    const delRevisions = await prisma.quotationRevision.deleteMany({
        where: { quotation: { organizationId: orgId } },
    });
    const delQuotations = await prisma.quotation.deleteMany({
        where: { organizationId: orgId },
    });
    console.log(`  ✓ Removed ${delQuotations.count} demo quotations (${delRevisions.count} revisions, ${delQuoteLines.count} lines)`);

    console.log("[CLEANUP COMPLETE] Ready for clean domain flow re-seeding.\n");
}
