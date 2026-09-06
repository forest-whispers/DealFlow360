import {
    QuotationStatus,
    InvoiceStatus,
} from "@prisma/client";
import { prisma } from "@/server/shared/db/prisma";
import { quotationService } from "@/server/modules/quotations/quotation.service";
import { negotiationService } from "@/server/modules/negotiation/negotiation.service";
import { billingService } from "@/server/modules/billing/billing.service";
import type { DemoActors, DemoProducts, DemoQuotationSummary } from "./types";

export async function seedBilling(
    actors: DemoActors,
    products: DemoProducts,
): Promise<DemoQuotationSummary[]> {
    console.log("--> Stage 8: Executing Authoritative Billing, Invoicing, Payments & Subscriptions...");

    const summaries: DemoQuotationSummary[] = [];

    // =========================================================================
    // 1. Scenario I: BILLING / PAID
    // Confirmed quote -> generateBilling -> payInvoice
    // Result: PAID invoice + authoritative Payment record (PAY-YYYY-XXXX).
    // Populates /billing with settled revenue and payment history.
    // =========================================================================
    const quoteI = await prisma.quotation.findFirst({
        where: {
            organizationId: actors.admin.organizationId,
            customerId: actors.bronzeCustomer.id,
            status: QuotationStatus.CONFIRMED,
            invoices: {
                some: {
                    status: InvoiceStatus.PAID,
                },
            },
        },
        include: {
            revisions: { orderBy: { revisionNumber: "desc" }, take: 1 },
            invoices: {
                where: { status: InvoiceStatus.PAID },
                include: { payments: true },
            },
        },
    });

    if (quoteI && quoteI.invoices.length > 0) {
        const inv = quoteI.invoices[0];
        const payRef = inv.payments[0]?.reference ?? "PAY-RECORDED";
        console.log(`    ✓ [Reused] Scenario I (BILLING - PAID): ${quoteI.quoteNumber} -> Invoice: ${inv.invoiceNumber} (Paid: ${payRef})`);
        summaries.push({
            scenario: "DEMO-QUOTE-PAID",
            quotationId: quoteI.id,
            quoteNumber: quoteI.quoteNumber,
            customerTier: "BRONZE",
            customerEmail: actors.bronzeCustomer.email,
            status: quoteI.status,
            revisionNumber: quoteI.revisions[0].revisionNumber,
            details: `Invoice ${inv.invoiceNumber} settled via Payment ${payRef} ($${inv.total.toNumber().toFixed(2)})`,
        });
    } else {
        // Step 1: Create, save, submit, send, confirm quote
        const created = await quotationService.createQuotation(actors.salesRep, {
            customerId: actors.bronzeCustomer.id,
        });

        await quotationService.saveDraft(actors.salesRep, created.id, {
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
                    discountPercent: 0,
                },
            ],
            orderDiscountPercent: 0,
        });

        await quotationService.submitQuotation(actors.salesRep, created.id);
        await quotationService.sendQuotation(actors.salesRep, created.id);
        await negotiationService.confirmQuotation(actors.bronzeCustomer, created.id);

        // Step 2: Generate billing through canonical billing service
        const billingRes = await billingService.generateBilling(actors.admin, {
            quotationId: created.id,
        });

        if (!billingRes.invoice) {
            throw new Error("Failed to generate invoice for one-time quotation lines.");
        }

        // Step 3: Authoritatively settle invoice via payInvoice
        const paidInvoice = await billingService.payInvoice(actors.admin, billingRes.invoice.id);
        const paymentRef = paidInvoice.payments[0]?.reference ?? "PAY-RECORDED";

        console.log(`    ✓ [Created] Scenario I (BILLING - PAID): ${created.quoteNumber} -> ${paidInvoice.invoiceNumber} (Paid: ${paymentRef}, $${paidInvoice.total.toFixed(2)})`);
        summaries.push({
            scenario: "DEMO-QUOTE-PAID",
            quotationId: created.id,
            quoteNumber: created.quoteNumber,
            customerTier: "BRONZE",
            customerEmail: actors.bronzeCustomer.email,
            status: QuotationStatus.CONFIRMED,
            revisionNumber: 1,
            details: `Invoice ${paidInvoice.invoiceNumber} settled via Payment ${paymentRef} ($${paidInvoice.total.toFixed(2)})`,
        });
    }

    // =========================================================================
    // 2. Scenario J: BILLING / PENDING
    // Confirmed quote -> generateBilling -> invoice remains PENDING.
    // Demonstrates pending settlement and "Pay Invoice" action in /billing.
    // =========================================================================
    const quoteJ = await prisma.quotation.findFirst({
        where: {
            organizationId: actors.admin.organizationId,
            customerId: actors.silverCustomer.id,
            status: QuotationStatus.CONFIRMED,
            invoices: {
                some: {
                    status: InvoiceStatus.PENDING,
                },
            },
            subscriptions: { none: {} },
        },
        include: {
            revisions: { orderBy: { revisionNumber: "desc" }, take: 1 },
            invoices: {
                where: { status: InvoiceStatus.PENDING },
            },
        },
    });

    if (quoteJ && quoteJ.invoices.length > 0) {
        const inv = quoteJ.invoices[0];
        console.log(`    ✓ [Reused] Scenario J (BILLING - PENDING): ${quoteJ.quoteNumber} -> Invoice: ${inv.invoiceNumber} ($${inv.total.toNumber().toFixed(2)})`);
        summaries.push({
            scenario: "DEMO-QUOTE-BILLING-PENDING",
            quotationId: quoteJ.id,
            quoteNumber: quoteJ.quoteNumber,
            customerTier: "SILVER",
            customerEmail: actors.silverCustomer.email,
            status: quoteJ.status,
            revisionNumber: quoteJ.revisions[0].revisionNumber,
            details: `Pending Invoice ${inv.invoiceNumber} ready for payment settlement ($${inv.total.toNumber().toFixed(2)})`,
        });
    } else {
        const created = await quotationService.createQuotation(actors.salesRep, {
            customerId: actors.silverCustomer.id,
        });

        await quotationService.saveDraft(actors.salesRep, created.id, {
            lines: [
                {
                    productId: products.switch24P.id,
                    lineNumber: 1,
                    quantity: 1,
                    discountPercent: 0,
                },
            ],
            orderDiscountPercent: 0,
        });

        await quotationService.submitQuotation(actors.salesRep, created.id);
        await quotationService.sendQuotation(actors.salesRep, created.id);
        await negotiationService.confirmQuotation(actors.silverCustomer, created.id);

        const billingRes = await billingService.generateBilling(actors.admin, {
            quotationId: created.id,
        });

        if (!billingRes.invoice) {
            throw new Error("Failed to generate pending invoice.");
        }

        console.log(`    ✓ [Created] Scenario J (BILLING - PENDING): ${created.quoteNumber} -> ${billingRes.invoice.invoiceNumber} ($${billingRes.invoice.total.toFixed(2)})`);
        summaries.push({
            scenario: "DEMO-QUOTE-BILLING-PENDING",
            quotationId: created.id,
            quoteNumber: created.quoteNumber,
            customerTier: "SILVER",
            customerEmail: actors.silverCustomer.email,
            status: QuotationStatus.CONFIRMED,
            revisionNumber: 1,
            details: `Pending Invoice ${billingRes.invoice.invoiceNumber} ready for payment settlement ($${billingRes.invoice.total.toFixed(2)})`,
        });
    }

    // =========================================================================
    // 3. Scenario K: MIXED BILLING (One-Time Hardware + Recurring Subscription)
    // Confirmed quote with hardware + monthly recurring fleet software.
    // generateBilling produces both Invoice and Subscription!
    // Populates /billing and /subscriptions workspaces simultaneously.
    // =========================================================================
    const quoteK = await prisma.quotation.findFirst({
        where: {
            organizationId: actors.admin.organizationId,
            customerId: actors.goldCustomer.id,
            status: QuotationStatus.CONFIRMED,
            invoices: { some: {} },
            subscriptions: { some: {} },
        },
        include: {
            revisions: { orderBy: { revisionNumber: "desc" }, take: 1 },
            invoices: true,
            subscriptions: true,
        },
    });

    if (quoteK && quoteK.invoices.length > 0 && quoteK.subscriptions.length > 0) {
        const inv = quoteK.invoices[0];
        const sub = quoteK.subscriptions[0];
        console.log(`    ✓ [Reused] Scenario K (MIXED BILLING): ${quoteK.quoteNumber} -> Invoice: ${inv.invoiceNumber}, Subscription: ${sub.subscriptionNumber}`);
        summaries.push({
            scenario: "DEMO-QUOTE-MIXED",
            quotationId: quoteK.id,
            quoteNumber: quoteK.quoteNumber,
            customerTier: "GOLD",
            customerEmail: actors.goldCustomer.email,
            status: quoteK.status,
            revisionNumber: quoteK.revisions[0].revisionNumber,
            details: `Mixed Model: Invoice ${inv.invoiceNumber} ($${inv.total.toNumber().toFixed(2)}) + Subscription ${sub.subscriptionNumber} ($${sub.recurringAmount.toNumber().toFixed(2)}/mo)`,
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
                    quantity: 1,
                    discountPercent: 0,
                },
                {
                    productId: products.cloudFleetSuite.id,
                    variantId: products.fleetVariantEnt.id,
                    lineNumber: 2,
                    quantity: 2,
                    discountPercent: 0,
                },
            ],
            orderDiscountPercent: 0,
        });

        await quotationService.submitQuotation(actors.salesRep, created.id);
        await quotationService.sendQuotation(actors.salesRep, created.id);
        await negotiationService.confirmQuotation(actors.goldCustomer, created.id);

        const billingRes = await billingService.generateBilling(actors.admin, {
            quotationId: created.id,
        });

        if (!billingRes.invoice || billingRes.subscriptions.length === 0) {
            throw new Error("Mixed billing failed to produce both invoice and subscription.");
        }

        const inv = billingRes.invoice;
        const sub = billingRes.subscriptions[0];

        console.log(`    ✓ [Created] Scenario K (MIXED BILLING): ${created.quoteNumber} -> ${inv.invoiceNumber} ($${inv.total.toFixed(2)}) + ${sub.subscriptionNumber} ($${sub.recurringAmount.toFixed(2)}/mo)`);
        summaries.push({
            scenario: "DEMO-QUOTE-MIXED",
            quotationId: created.id,
            quoteNumber: created.quoteNumber,
            customerTier: "GOLD",
            customerEmail: actors.goldCustomer.email,
            status: QuotationStatus.CONFIRMED,
            revisionNumber: 1,
            details: `Mixed Model: Invoice ${inv.invoiceNumber} ($${inv.total.toFixed(2)}) + Subscription ${sub.subscriptionNumber} ($${sub.recurringAmount.toFixed(2)}/mo)`,
        });
    }

    return summaries;
}
