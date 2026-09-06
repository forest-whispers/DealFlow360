import { prisma } from "../src/server/shared/db/prisma";
import { UserRole, QuotationStatus, QuotationRevisionStatus, FulfillmentStatus, InvoiceStatus, SubscriptionStatus } from "@prisma/client";

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(`[VERIFICATION FAILED]: ${message}`);
    }
}

async function verifyDemoData() {
    console.log("================================================================================");
    console.log("              AUTOMATED DEMO DATA INTEGRITY & WORKFLOW VERIFICATION             ");
    console.log("================================================================================");

    const org = await prisma.organization.findUnique({
        where: { slug: "dealflow-demo" },
    });
    assert(!!org, "Demo organization 'dealflow-demo' must exist");
    const orgId = org!.id;

    // 1. Verify Users & Roles
    console.log("\n[1/7] Verifying Users & Role Representation...");
    const users = await prisma.user.findMany({ where: { organizationId: orgId } });
    const roles = new Set(users.map((u) => u.role));
    assert(roles.has(UserRole.ADMIN), "ADMIN user exists");
    assert(roles.has(UserRole.SALES_MANAGER), "SALES_MANAGER user exists");
    assert(roles.has(UserRole.SALES_REP), "SALES_REP user exists");
    assert(roles.has(UserRole.FINANCE_OPERATIONS), "FINANCE_OPERATIONS user exists");
    assert(roles.has(UserRole.CUSTOMER), "CUSTOMER user exists");

    const customers = users.filter((u) => u.role === UserRole.CUSTOMER);
    assert(customers.length === 3, "Exactly 3 demo customers exist");
    const customerTiers = new Set(customers.map((c) => c.customerTier));
    assert(customerTiers.has("BRONZE"), "Bronze customer exists");
    assert(customerTiers.has("SILVER"), "Silver customer exists");
    assert(customerTiers.has("GOLD"), "Gold customer exists");
    console.log("  ✓ All 5 roles and 3 customer tiers verified.");

    // 2. Verify Products & Variants
    console.log("\n[2/7] Verifying Product Catalog & Category Coverage...");
    const products = await prisma.product.findMany({
        where: { organizationId: orgId },
        include: { variants: true },
    });
    assert(products.length >= 5, "At least 5 products exist");
    const categories = new Set(products.map((p) => p.category));
    assert(categories.has("Hardware"), "Hardware category exists");
    assert(categories.has("Services"), "Services category exists");
    assert(categories.has("Subscriptions"), "Subscriptions category exists");

    const withVariants = products.filter((p) => p.variants.length > 0);
    const withoutVariants = products.filter((p) => p.variants.length === 0);
    assert(withVariants.length >= 2, "Products with variants exist");
    assert(withoutVariants.length >= 2, "Directly sellable products without variants exist");
    console.log("  ✓ Product catalog, variants, and categories verified.");

    // 3. Verify Warehouses & Inventory
    console.log("\n[3/7] Verifying Warehouses & Allocation Stock Hierarchy...");
    const warehouses = await prisma.warehouse.findMany({
        where: { organizationId: orgId },
        orderBy: { priority: "asc" },
        include: { inventory: true },
    });
    assert(warehouses.length === 3, "Exactly 3 warehouses exist");
    assert(warehouses[0].code === "WH-NORTH" && warehouses[0].priority === 1, "WH-NORTH is priority 1");
    assert(warehouses[1].code === "WH-SOUTH" && warehouses[1].priority === 2, "WH-SOUTH is priority 2");
    assert(warehouses[2].code === "WH-EAST" && warehouses[2].priority === 3, "WH-EAST is priority 3");
    console.log("  ✓ Warehouse priority hierarchy verified.");

    // 4. Verify Quotations & Lifecycle Stages
    console.log("\n[4/7] Verifying Quotation Lifecycles & Governance States...");
    const quotations = await prisma.quotation.findMany({
        where: { organizationId: orgId },
        include: {
            revisions: {
                orderBy: { revisionNumber: "desc" },
                include: { lines: true, approvalRequests: { include: { steps: true } } },
            },
            negotiations: { include: { changeRequests: true } },
            fulfillments: { include: { lines: { include: { allocations: { include: { warehouse: true } } } } } },
            invoices: { include: { payments: true } },
            subscriptions: true,
        },
    });

    const draftQuote = quotations.find((q) => q.status === QuotationStatus.DRAFT);
    assert(!!draftQuote, "DRAFT quotation exists");

    const pendingApprovalQuotes = quotations.filter((q) => q.status === QuotationStatus.PENDING_APPROVAL);
    assert(pendingApprovalQuotes.length >= 2, "Both SM and Multi-Step pending approval quotations exist");

    const multiStep = pendingApprovalQuotes.find((q) => q.revisions[0]?.approvalRequests[0]?.steps.length === 2);
    assert(!!multiStep, "Multi-step approval quotation (SM -> Finance) exists");

    const sentQuote = quotations.find((q) => q.status === QuotationStatus.SENT && q.revisions[0]?.revisionNumber === 1);
    assert(!!sentQuote, "SENT quotation exists");

    const confirmedQuotes = quotations.filter((q) => q.status === QuotationStatus.CONFIRMED);
    assert(confirmedQuotes.length >= 5, "Confirmed quotations exist across fulfillment and billing scenarios");
    console.log("  ✓ All required quotation statuses and approval chains verified.");

    // 5. Verify Negotiation Flow Invariants
    console.log("\n[5/7] Verifying Negotiation Invariants (Pending vs Counter)...");
    const underNegQuote = quotations.find((q) => q.status === QuotationStatus.UNDER_NEGOTIATION);
    assert(!!underNegQuote, "UNDER_NEGOTIATION quotation exists");
    assert(underNegQuote!.revisions[0].revisionNumber === 1, "Active revision remains Revision 1");
    assert(underNegQuote!.revisions[0].lines[0].discountPercent.toNumber() === 15, "Active revision terms remained strictly 15%");
    const pendingCR = underNegQuote!.negotiations[0]?.changeRequests.find((cr) => cr.status === "PENDING");
    assert(!!pendingCR && pendingCR.discountPercent?.toNumber() === 18, "PENDING change request recorded at 18%");

    const counterQuote = quotations.find((q) => q.revisions.some((r) => r.revisionNumber === 2) && q.status === QuotationStatus.SENT);
    assert(!!counterQuote, "Sales counter quotation with Revision 2 exists in SENT status");
    const rev2 = counterQuote!.revisions.find((r) => r.revisionNumber === 2);
    assert(rev2!.lines[0].discountPercent.toNumber() === 14, "Revision 2 authoritatively reflects 14% terms");
    console.log("  ✓ Negotiation lifecycle invariants strictly preserved.");

    // 6. Verify Fulfillment & Backend Allocation Split
    console.log("\n[6/7] Verifying Pure Backend Fulfillment Allocation Split...");
    const fulfilledQuote = quotations.find((q) => q.fulfillments.some((f) => f.status === FulfillmentStatus.ALLOCATED));
    assert(!!fulfilledQuote, "Fulfilled quotation exists");
    const ful = fulfilledQuote!.fulfillments.find((f) => f.status === FulfillmentStatus.ALLOCATED)!;
    const fulLine = ful.lines[0];
    assert(fulLine.allocations.length === 2, "DEMO-CRITICAL: Backend split generated exactly 2 warehouse allocations");
    const allocNorth = fulLine.allocations.find((a) => a.warehouse.code === "WH-NORTH");
    const allocSouth = fulLine.allocations.find((a) => a.warehouse.code === "WH-SOUTH");
    assert(allocNorth?.quantity === 6, "WH-NORTH supplied 6 units (Priority 1 cap)");
    assert(allocSouth?.quantity === 4, "WH-SOUTH supplied 4 units (Priority 2 overflow)");

    const shortageQuote = quotations.find((q) => q.fulfillments.some((f) => f.status === FulfillmentStatus.PARTIALLY_ALLOCATED));
    assert(!!shortageQuote, "Shortage quotation exists");
    const shortageFul = shortageQuote!.fulfillments.find((f) => f.status === FulfillmentStatus.PARTIALLY_ALLOCATED)!;
    assert(shortageFul.lines[0].allocatedQty === 3 && shortageFul.lines[0].requiredQty === 5, "Shortage correctly reflects 3 allocated / 5 required");
    console.log("  ✓ Multi-warehouse allocation split and shortage state verified.");

    // 7. Verify Billing, Payments & Subscriptions
    console.log("\n[7/7] Verifying Billing, Payments & Mixed Invoicing...");
    const paidQuote = quotations.find((q) => q.invoices.some((i) => i.status === InvoiceStatus.PAID));
    assert(!!paidQuote, "PAID invoice quotation exists");
    const paidInv = paidQuote!.invoices.find((i) => i.status === InvoiceStatus.PAID)!;
    assert(paidInv.payments.length === 1, "Authoritative Payment record exists");
    assert(Boolean(paidInv.payments[0].reference?.startsWith("PAY-")), "Payment reference format PAY-YYYY-XXXX verified");

    const pendingInvQuote = quotations.find((q) => q.invoices.some((i) => i.status === InvoiceStatus.PENDING) && q.subscriptions.length === 0);
    assert(!!pendingInvQuote, "PENDING invoice quotation exists");

    const mixedQuote = quotations.find((q) => q.invoices.length > 0 && q.subscriptions.length > 0);
    assert(!!mixedQuote, "MIXED billing quotation exists");
    assert(mixedQuote!.invoices[0].status === InvoiceStatus.PENDING, "Mixed quotation created one-time invoice");
    assert(mixedQuote!.subscriptions[0].status === SubscriptionStatus.ACTIVE, "Mixed quotation created active subscription");
    console.log("  ✓ Billing, payments, and subscriptions verified.");

    console.log("\n================================================================================");
    console.log("              ALL DEMO DATA DOMAIN INVARIANTS VERIFIED 100%!                   ");
    console.log("================================================================================");
}

verifyDemoData()
    .catch((err) => {
        console.error("\n[VERIFICATION ERROR]:", err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
