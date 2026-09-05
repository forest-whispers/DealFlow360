import { z } from "zod";

export const quotationIdParamSchema = z
    .object({
        id: z
            .string({
                message: "Quotation ID is required.",
            })
            .trim()
            .min(1, "Quotation ID is required."),
    })
    .strict();

export type QuotationIdParam = z.infer<typeof quotationIdParamSchema>;
