import { z } from "zod";
import { FulfillmentStatus, FULFILLMENT_PAGINATION } from "./fulfillment.constants";

export const createFulfillmentSchema = z
    .object({
        quotationId: z.string().trim().min(1, "Quotation ID is required"),
    })
    .strict();

export const fulfillmentIdParamSchema = z.object({
    id: z.string().trim().min(1, "Fulfillment ID is required"),
});

export const listFulfillmentsSchema = z.object({
    page: z.coerce
        .number()
        .int()
        .min(1)
        .default(FULFILLMENT_PAGINATION.DEFAULT_PAGE),
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(FULFILLMENT_PAGINATION.MAX_LIMIT)
        .default(FULFILLMENT_PAGINATION.DEFAULT_LIMIT),
    status: z.nativeEnum(FulfillmentStatus).optional(),
    quotationId: z.string().trim().optional(),
});
