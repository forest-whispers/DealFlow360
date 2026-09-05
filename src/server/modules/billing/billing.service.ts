import {
    BillingInterval,
    Invoice,
    InvoiceLine,
    InvoiceStatus,
    Payment,
    Prisma,
    QuotationRevision,
    QuotationRevisionStatus,
    QuotationStatus,
    Subscription,
    SubscriptionLine,
    SubscriptionStatus,
    User,
    UserRole,
} from "@prisma/client";
import { prisma } from "@/server/shared/db/prisma";
import {
    BadRequestError,
    ConflictError,
    NotFoundError,
} from "@/server/shared/errors/errors";
import type { AuthenticatedUser } from "@/server/modules/auth/auth.types";
import { BILLING_PAGINATION } from "./billing.constants";
import {
    calculateNextBillingDate,
    LineForBilling,
    partitionLinesForBilling,
} from "./billing.calculation";
import type {
    GenerateBillingInput,
    GenerateBillingResponse,
    InvoiceLineResponse,
    InvoiceListResponse,
    InvoiceResponse,
    InvoiceSummaryResponse,
    ListInvoicesQuery,
    ListSubscriptionsQuery,
    PaymentResponse,
    SubscriptionLineResponse,
    SubscriptionListResponse,
    SubscriptionResponse,
    SubscriptionSummaryResponse,
} from "./billing.types";

type FullInvoice = Invoice & {
    customer: Pick<User, "name">;
    quotation: { quoteNumber: string };
    revision: { revisionNumber: number };
    lines: InvoiceLine[];
    payments: Payment[];
};

type FullSubscription = Subscription & {
    customer: Pick<User, "name">;
    quotation: { quoteNumber: string };
    revision: { revisionNumber: number };
    lines: SubscriptionLine[];
};

export class BillingService {
    // ==========================================
    // Internal Helper: Map Invoice to Response
    // ==========================================
    private mapInvoiceToResponse(record: FullInvoice): InvoiceResponse {
        const lines: InvoiceLineResponse[] = record.lines.map((l) => ({
            id: l.id,
            quotationLineNumber: l.quotationLineNumber,
            productId: l.productId,
            variantId: l.variantId,
            name: l.name,
            sku: l.sku,
            quantity: l.quantity,
            unitPrice: l.unitPrice.toNumber(),
            discountPercent: l.discountPercent.toNumber(),
            lineTotal: l.lineTotal.toNumber(),
        }));

        const payments: PaymentResponse[] = record.payments.map((p) => ({
            id: p.id,
            invoiceId: p.invoiceId,
            amount: p.amount.toNumber(),
            paidAt: p.paidAt.toISOString(),
            reference: p.reference,
            createdAt: p.createdAt.toISOString(),
        }));

        return {
            id: record.id,
            invoiceNumber: record.invoiceNumber,
            quotationId: record.quotationId,
            quotationNumber: record.quotation.quoteNumber,
            revisionId: record.revisionId,
            revisionNumber: record.revision.revisionNumber,
            customerId: record.customerId,
            customerName: record.customer.name,
            status: record.status,
            subtotal: record.subtotal.toNumber(),
            total: record.total.toNumber(),
            dueDate: record.dueDate ? record.dueDate.toISOString() : null,
            paidAt: record.paidAt ? record.paidAt.toISOString() : null,
            lines,
            payments,
            createdAt: record.createdAt.toISOString(),
            updatedAt: record.updatedAt.toISOString(),
        };
    }

    // ==========================================
    // Internal Helper: Map Subscription to Response
    // ==========================================
    private mapSubscriptionToResponse(
        record: FullSubscription,
    ): SubscriptionResponse {
        const lines: SubscriptionLineResponse[] = record.lines.map((l) => ({
            id: l.id,
            quotationLineNumber: l.quotationLineNumber,
            productId: l.productId,
            variantId: l.variantId,
            name: l.name,
            sku: l.sku,
            quantity: l.quantity,
            unitPrice: l.unitPrice.toNumber(),
            discountPercent: l.discountPercent.toNumber(),
            lineTotal: l.lineTotal.toNumber(),
        }));

        return {
            id: record.id,
            subscriptionNumber: record.subscriptionNumber,
            quotationId: record.quotationId,
            quotationNumber: record.quotation.quoteNumber,
            revisionId: record.revisionId,
            revisionNumber: record.revision.revisionNumber,
            customerId: record.customerId,
            customerName: record.customer.name,
            status: record.status,
            billingInterval: record.billingInterval,
            recurringAmount: record.recurringAmount.toNumber(),
            startDate: record.startDate.toISOString(),
            nextBillingDate: record.nextBillingDate.toISOString(),
            lines,
            createdAt: record.createdAt.toISOString(),
            updatedAt: record.updatedAt.toISOString(),
        };
    }

    // ==========================================
    // Internal Helper: Number Generators
    // ==========================================
    private async generateInvoiceNumber(
        tx: Prisma.TransactionClient,
        organizationId: string,
    ): Promise<string> {
        const currentYear = new Date().getFullYear();
        const prefix = `INV-${currentYear}-`;

        const lastInvoice = await tx.invoice.findFirst({
            where: {
                organizationId,
                invoiceNumber: { startsWith: prefix },
            },
            orderBy: { invoiceNumber: "desc" },
            select: { invoiceNumber: true },
        });

        let nextSeq = 1;
        if (lastInvoice) {
            const parts = lastInvoice.invoiceNumber.split("-");
            const num = parseInt(parts[2], 10);
            if (!isNaN(num)) {
                nextSeq = num + 1;
            }
        }

        return `${prefix}${String(nextSeq).padStart(4, "0")}`;
    }

    private async generateSubscriptionNumber(
        tx: Prisma.TransactionClient,
        organizationId: string,
    ): Promise<string> {
        const currentYear = new Date().getFullYear();
        const prefix = `SUB-${currentYear}-`;

        const lastSub = await tx.subscription.findFirst({
            where: {
                organizationId,
                subscriptionNumber: { startsWith: prefix },
            },
            orderBy: { subscriptionNumber: "desc" },
            select: { subscriptionNumber: true },
        });

        let nextSeq = 1;
        if (lastSub) {
            const parts = lastSub.subscriptionNumber.split("-");
            const num = parseInt(parts[2], 10);
            if (!isNaN(num)) {
                nextSeq = num + 1;
            }
        }

        return `${prefix}${String(nextSeq).padStart(4, "0")}`;
    }

    private async generatePaymentReference(
        tx: Prisma.TransactionClient,
        organizationId: string,
    ): Promise<string> {
        const currentYear = new Date().getFullYear();
        const prefix = `PAY-${currentYear}-`;

        const lastPayment = await tx.payment.findFirst({
            where: {
                invoice: { organizationId },
                reference: { startsWith: prefix },
            },
            orderBy: { reference: "desc" },
            select: { reference: true },
        });

        let nextSeq = 1;
        if (lastPayment && lastPayment.reference) {
            const parts = lastPayment.reference.split("-");
            const num = parseInt(parts[2], 10);
            if (!isNaN(num)) {
                nextSeq = num + 1;
            }
        }

        return `${prefix}${String(nextSeq).padStart(4, "0")}`;
    }

    // ==========================================
    // 1. Generate Billing (All-Or-Nothing)
    // ==========================================
    async generateBilling(
        user: AuthenticatedUser,
        input: GenerateBillingInput,
    ): Promise<GenerateBillingResponse> {
        return await prisma.$transaction(async (tx) => {
            // Lock ordering: Organization first, then Quotation
            await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${user.organizationId} FOR UPDATE`;

            const quotationRows = await tx.$queryRaw<
                Array<{ id: string; status: string }>
            >`
                SELECT id, status FROM "Quotation" 
                WHERE id = ${input.quotationId} AND "organizationId" = ${user.organizationId} 
                FOR UPDATE
            `;

            if (quotationRows.length === 0) {
                throw new NotFoundError("Quotation not found.");
            }

            const quotation = await tx.quotation.findFirst({
                where: {
                    id: input.quotationId,
                    organizationId: user.organizationId,
                },
                include: {
                    customer: { select: { id: true, name: true } },
                    revisions: {
                        orderBy: { revisionNumber: "desc" },
                        take: 1,
                        include: {
                            lines: {
                                orderBy: { lineNumber: "asc" },
                                include: {
                                    product: {
                                        select: {
                                            id: true,
                                            name: true,
                                            billingType: true,
                                            billingInterval: true,
                                        },
                                    },
                                },
                            },
                            invoices: { select: { id: true } },
                            subscriptions: {
                                select: { id: true, billingInterval: true },
                            },
                        },
                    },
                },
            });

            if (!quotation) {
                throw new NotFoundError("Quotation not found.");
            }

            if (quotation.status !== QuotationStatus.CONFIRMED) {
                throw new BadRequestError(
                    `Only CONFIRMED quotations can be billed. Current status is ${quotation.status}.`,
                );
            }

            const latestRevision = quotation.revisions[0];
            if (!latestRevision) {
                throw new BadRequestError("Quotation revision not found.");
            }

            if (latestRevision.status !== QuotationRevisionStatus.CONFIRMED) {
                throw new BadRequestError(
                    `Latest quotation revision is not CONFIRMED. Current revision status is ${latestRevision.status}.`,
                );
            }

            if (latestRevision.lines.length === 0) {
                throw new BadRequestError("Quotation has no lines to bill.");
            }

            // Partition lines
            const linesForBilling: LineForBilling[] = latestRevision.lines.map(
                (l) => ({
                    quotationLineNumber: l.lineNumber,
                    productId: l.productId,
                    variantId: l.variantId,
                    name: l.name,
                    sku: l.sku,
                    quantity: l.quantity,
                    unitPrice: l.unitPrice,
                    discountPercent: l.discountPercent,
                    lineSubtotal: l.lineSubtotal,
                    lineDiscount: l.lineDiscount,
                    lineTotal: l.lineTotal,
                    product: l.product,
                }),
            );

            const { oneTimeLines, recurringGroups } =
                partitionLinesForBilling(linesForBilling);

            // Duplicate prevention check:
            // If one-time lines exist, verify no invoice exists for this revision
            if (oneTimeLines.length > 0 && latestRevision.invoices.length > 0) {
                throw new ConflictError(
                    "Billing has already been generated for this quotation revision.",
                );
            }

            // For each recurring interval, verify no subscription exists for this revision + interval
            for (const interval of recurringGroups.keys()) {
                if (
                    latestRevision.subscriptions.some(
                        (s) => s.billingInterval === interval,
                    )
                ) {
                    throw new ConflictError(
                        "Billing has already been generated for this quotation revision.",
                    );
                }
            }

            // Create Invoice if one-time lines exist
            let createdInvoiceRecord: FullInvoice | null = null;
            if (oneTimeLines.length > 0) {
                const subtotal = oneTimeLines.reduce(
                    (acc, l) => acc.add(l.lineSubtotal),
                    new Prisma.Decimal(0),
                );
                const total = oneTimeLines.reduce(
                    (acc, l) => acc.add(l.lineTotal),
                    new Prisma.Decimal(0),
                );

                const invoiceNumber = await this.generateInvoiceNumber(
                    tx,
                    user.organizationId,
                );

                const createdInvoice = await tx.invoice.create({
                    data: {
                        invoiceNumber,
                        quotationId: quotation.id,
                        revisionId: latestRevision.id,
                        customerId: quotation.customerId,
                        organizationId: user.organizationId,
                        status: InvoiceStatus.PENDING,
                        subtotal,
                        total,
                    },
                });

                for (const line of oneTimeLines) {
                    await tx.invoiceLine.create({
                        data: {
                            invoiceId: createdInvoice.id,
                            quotationLineNumber: line.quotationLineNumber,
                            productId: line.productId,
                            variantId: line.variantId,
                            name: line.name,
                            sku: line.sku,
                            quantity: line.quantity,
                            unitPrice: line.unitPrice,
                            discountPercent: line.discountPercent,
                            lineTotal: line.lineTotal,
                        },
                    });
                }

                createdInvoiceRecord = await tx.invoice.findUniqueOrThrow({
                    where: { id: createdInvoice.id },
                    include: {
                        customer: { select: { name: true } },
                        quotation: { select: { quoteNumber: true } },
                        revision: { select: { revisionNumber: true } },
                        lines: {
                            orderBy: { quotationLineNumber: "asc" },
                        },
                        payments: true,
                    },
                });
            }

            // Create Subscriptions for each recurring interval group
            const createdSubscriptionRecords: FullSubscription[] = [];
            const now = new Date();

            for (const [interval, lines] of recurringGroups.entries()) {
                const recurringAmount = lines.reduce(
                    (acc, l) => acc.add(l.lineTotal),
                    new Prisma.Decimal(0),
                );

                const subscriptionNumber = await this.generateSubscriptionNumber(
                    tx,
                    user.organizationId,
                );

                const startDate = now;
                const nextBillingDate = calculateNextBillingDate(
                    startDate,
                    interval,
                );

                const createdSub = await tx.subscription.create({
                    data: {
                        subscriptionNumber,
                        quotationId: quotation.id,
                        revisionId: latestRevision.id,
                        customerId: quotation.customerId,
                        organizationId: user.organizationId,
                        status: SubscriptionStatus.ACTIVE,
                        billingInterval: interval,
                        recurringAmount,
                        startDate,
                        nextBillingDate,
                    },
                });

                for (const line of lines) {
                    await tx.subscriptionLine.create({
                        data: {
                            subscriptionId: createdSub.id,
                            quotationLineNumber: line.quotationLineNumber,
                            productId: line.productId,
                            variantId: line.variantId,
                            name: line.name,
                            sku: line.sku,
                            quantity: line.quantity,
                            unitPrice: line.unitPrice,
                            discountPercent: line.discountPercent,
                            lineTotal: line.lineTotal,
                        },
                    });
                }

                const fullSub = await tx.subscription.findUniqueOrThrow({
                    where: { id: createdSub.id },
                    include: {
                        customer: { select: { name: true } },
                        quotation: { select: { quoteNumber: true } },
                        revision: { select: { revisionNumber: true } },
                        lines: {
                            orderBy: { quotationLineNumber: "asc" },
                        },
                    },
                });

                createdSubscriptionRecords.push(fullSub);
            }

            return {
                invoice: createdInvoiceRecord
                    ? this.mapInvoiceToResponse(createdInvoiceRecord)
                    : null,
                subscriptions: createdSubscriptionRecords.map((s) =>
                    this.mapSubscriptionToResponse(s),
                ),
            };
        });
    }

    // ==========================================
    // 2. Pay Invoice (Simulated Payment)
    // ==========================================
    async payInvoice(
        user: AuthenticatedUser,
        invoiceId: string,
    ): Promise<InvoiceResponse> {
        return await prisma.$transaction(async (tx) => {
            // Lock Organization row to serialize payment reference generation
            await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${user.organizationId} FOR UPDATE`;

            // Lock Invoice row FOR UPDATE
            const invoiceRows = await tx.$queryRaw<
                Array<{
                    id: string;
                    status: string;
                    customerId: string;
                    organizationId: string;
                    total: Prisma.Decimal;
                }>
            >`
                SELECT id, status, "customerId", "organizationId", total 
                FROM "Invoice" 
                WHERE id = ${invoiceId} AND "organizationId" = ${user.organizationId} 
                FOR UPDATE
            `;

            if (invoiceRows.length === 0) {
                throw new NotFoundError("Invoice not found.");
            }

            const invoiceRow = invoiceRows[0];

            // Anti-enumeration for customer: cannot see or pay invoices of other customers
            if (
                user.role === UserRole.CUSTOMER &&
                invoiceRow.customerId !== user.id
            ) {
                throw new NotFoundError("Invoice not found.");
            }

            if (invoiceRow.status === InvoiceStatus.PAID) {
                throw new ConflictError("Invoice is already paid.");
            }

            // Atomic conditional update
            const now = new Date();
            const updateResult = await tx.invoice.updateMany({
                where: {
                    id: invoiceId,
                    status: InvoiceStatus.PENDING,
                },
                data: {
                    status: InvoiceStatus.PAID,
                    paidAt: now,
                },
            });

            if (updateResult.count === 0) {
                throw new ConflictError("Invoice is already paid.");
            }

            // Create Payment record
            const reference = await this.generatePaymentReference(
                tx,
                user.organizationId,
            );

            await tx.payment.create({
                data: {
                    invoiceId,
                    amount: invoiceRow.total,
                    paidAt: now,
                    reference,
                },
            });

            const updatedInvoice = await tx.invoice.findUniqueOrThrow({
                where: { id: invoiceId },
                include: {
                    customer: { select: { name: true } },
                    quotation: { select: { quoteNumber: true } },
                    revision: { select: { revisionNumber: true } },
                    lines: {
                        orderBy: { quotationLineNumber: "asc" },
                    },
                    payments: {
                        orderBy: { paidAt: "desc" },
                    },
                },
            });

            return this.mapInvoiceToResponse(updatedInvoice);
        });
    }

    // ==========================================
    // 3. Get Invoice By ID
    // ==========================================
    async getInvoiceById(
        user: AuthenticatedUser,
        id: string,
    ): Promise<InvoiceResponse> {
        const where: Prisma.InvoiceWhereInput = {
            id,
            organizationId: user.organizationId,
        };

        if (user.role === UserRole.CUSTOMER) {
            where.customerId = user.id;
        }

        const record = await prisma.invoice.findFirst({
            where,
            include: {
                customer: { select: { name: true } },
                quotation: { select: { quoteNumber: true } },
                revision: { select: { revisionNumber: true } },
                lines: {
                    orderBy: { quotationLineNumber: "asc" },
                },
                payments: {
                    orderBy: { paidAt: "desc" },
                },
            },
        });

        if (!record) {
            throw new NotFoundError("Invoice not found.");
        }

        return this.mapInvoiceToResponse(record);
    }

    // ==========================================
    // 4. List Invoices
    // ==========================================
    async listInvoices(
        user: AuthenticatedUser,
        query: ListInvoicesQuery,
    ): Promise<InvoiceListResponse> {
        const page = query.page ?? BILLING_PAGINATION.DEFAULT_PAGE;
        const limit = query.limit ?? BILLING_PAGINATION.DEFAULT_LIMIT;
        const skip = (page - 1) * limit;

        const where: Prisma.InvoiceWhereInput = {
            organizationId: user.organizationId,
        };

        if (user.role === UserRole.CUSTOMER) {
            where.customerId = user.id;
        }

        if (query.status) {
            where.status = query.status;
        }

        if (query.quotationId) {
            where.quotationId = query.quotationId.trim();
        }

        const [total, records] = await prisma.$transaction([
            prisma.invoice.count({ where }),
            prisma.invoice.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    customer: { select: { name: true } },
                    quotation: { select: { quoteNumber: true } },
                    revision: { select: { revisionNumber: true } },
                    _count: {
                        select: { lines: true },
                    },
                },
            }),
        ]);

        const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

        const invoices: InvoiceSummaryResponse[] = records.map((record) => ({
            id: record.id,
            invoiceNumber: record.invoiceNumber,
            quotationId: record.quotationId,
            quotationNumber: record.quotation.quoteNumber,
            revisionId: record.revisionId,
            revisionNumber: record.revision.revisionNumber,
            customerId: record.customerId,
            customerName: record.customer.name,
            status: record.status,
            subtotal: record.subtotal.toNumber(),
            total: record.total.toNumber(),
            dueDate: record.dueDate ? record.dueDate.toISOString() : null,
            paidAt: record.paidAt ? record.paidAt.toISOString() : null,
            lineCount: record._count.lines,
            createdAt: record.createdAt.toISOString(),
            updatedAt: record.updatedAt.toISOString(),
        }));

        return {
            invoices,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }

    // ==========================================
    // 5. Get Subscription By ID
    // ==========================================
    async getSubscriptionById(
        user: AuthenticatedUser,
        id: string,
    ): Promise<SubscriptionResponse> {
        const where: Prisma.SubscriptionWhereInput = {
            id,
            organizationId: user.organizationId,
        };

        if (user.role === UserRole.CUSTOMER) {
            where.customerId = user.id;
        }

        const record = await prisma.subscription.findFirst({
            where,
            include: {
                customer: { select: { name: true } },
                quotation: { select: { quoteNumber: true } },
                revision: { select: { revisionNumber: true } },
                lines: {
                    orderBy: { quotationLineNumber: "asc" },
                },
            },
        });

        if (!record) {
            throw new NotFoundError("Subscription not found.");
        }

        return this.mapSubscriptionToResponse(record);
    }

    // ==========================================
    // 6. List Subscriptions
    // ==========================================
    async listSubscriptions(
        user: AuthenticatedUser,
        query: ListSubscriptionsQuery,
    ): Promise<SubscriptionListResponse> {
        const page = query.page ?? BILLING_PAGINATION.DEFAULT_PAGE;
        const limit = query.limit ?? BILLING_PAGINATION.DEFAULT_LIMIT;
        const skip = (page - 1) * limit;

        const where: Prisma.SubscriptionWhereInput = {
            organizationId: user.organizationId,
        };

        if (user.role === UserRole.CUSTOMER) {
            where.customerId = user.id;
        }

        if (query.status) {
            where.status = query.status;
        }

        if (query.billingInterval) {
            where.billingInterval = query.billingInterval;
        }

        if (query.quotationId) {
            where.quotationId = query.quotationId.trim();
        }

        const [total, records] = await prisma.$transaction([
            prisma.subscription.count({ where }),
            prisma.subscription.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    customer: { select: { name: true } },
                    quotation: { select: { quoteNumber: true } },
                    revision: { select: { revisionNumber: true } },
                    _count: {
                        select: { lines: true },
                    },
                },
            }),
        ]);

        const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

        const subscriptions: SubscriptionSummaryResponse[] = records.map(
            (record) => ({
                id: record.id,
                subscriptionNumber: record.subscriptionNumber,
                quotationId: record.quotationId,
                quotationNumber: record.quotation.quoteNumber,
                revisionId: record.revisionId,
                revisionNumber: record.revision.revisionNumber,
                customerId: record.customerId,
                customerName: record.customer.name,
                status: record.status,
                billingInterval: record.billingInterval,
                recurringAmount: record.recurringAmount.toNumber(),
                startDate: record.startDate.toISOString(),
                nextBillingDate: record.nextBillingDate.toISOString(),
                lineCount: record._count.lines,
                createdAt: record.createdAt.toISOString(),
                updatedAt: record.updatedAt.toISOString(),
            }),
        );

        return {
            subscriptions,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }
}

export const billingService = new BillingService();
