import { z } from "zod";
import {
    BillingInterval,
    BILLING_PAGINATION,
    InvoiceStatus,
    SubscriptionStatus,
} from "./billing.constants";

export const generateBillingSchema = z
    .object({
        quotationId: z.string().trim().min(1, "Quotation ID is required."),
    })
    .strict();

export const invoiceIdParamSchema = z.object({
    id: z.string().trim().min(1, "Invoice ID is required."),
});

export const subscriptionIdParamSchema = z.object({
    id: z.string().trim().min(1, "Subscription ID is required."),
});

export const payInvoiceSchema = z.object({}).strict();

export const listInvoicesSchema = z.object({
    page: z.coerce
        .number()
        .int()
        .min(1)
        .default(BILLING_PAGINATION.DEFAULT_PAGE),
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(BILLING_PAGINATION.MAX_LIMIT)
        .default(BILLING_PAGINATION.DEFAULT_LIMIT),
    status: z.nativeEnum(InvoiceStatus).optional(),
    quotationId: z.string().trim().optional(),
});

export const listSubscriptionsSchema = z.object({
    page: z.coerce
        .number()
        .int()
        .min(1)
        .default(BILLING_PAGINATION.DEFAULT_PAGE),
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(BILLING_PAGINATION.MAX_LIMIT)
        .default(BILLING_PAGINATION.DEFAULT_LIMIT),
    status: z.nativeEnum(SubscriptionStatus).optional(),
    billingInterval: z.nativeEnum(BillingInterval).optional(),
    quotationId: z.string().trim().optional(),
});
