import { BillingInterval, BillingType, Prisma } from "@prisma/client";
import { BadRequestError } from "@/server/shared/errors/errors";

export interface LineForBilling {
    quotationLineNumber: number;
    productId: string;
    variantId: string | null;
    name: string;
    sku: string | null;
    quantity: number;
    unitPrice: Prisma.Decimal;
    discountPercent: Prisma.Decimal;
    lineSubtotal: Prisma.Decimal;
    lineDiscount: Prisma.Decimal;
    lineTotal: Prisma.Decimal;
    product: {
        id: string;
        name: string;
        billingType: BillingType;
        billingInterval: BillingInterval | null;
    };
}

export interface PartitionedBillingLines {
    oneTimeLines: LineForBilling[];
    recurringGroups: Map<BillingInterval, LineForBilling[]>;
}

/**
 * Calculates the next billing date based on start date and interval.
 * Uses calendar-aware date progression without hardcoding month lengths.
 */
export function calculateNextBillingDate(
    startDate: Date,
    interval: BillingInterval,
): Date {
    const next = new Date(startDate.getTime());
    const originalDay = next.getDate();

    if (interval === BillingInterval.MONTHLY) {
        next.setMonth(next.getMonth() + 1);
        if (next.getDate() !== originalDay) {
            next.setDate(0);
        }
    } else if (interval === BillingInterval.QUARTERLY) {
        next.setMonth(next.getMonth() + 3);
        if (next.getDate() !== originalDay) {
            next.setDate(0);
        }
    } else if (interval === BillingInterval.YEARLY) {
        next.setFullYear(next.getFullYear() + 1);
        if (next.getDate() !== originalDay) {
            next.setDate(0);
        }
    }
    return next;
}

/**
 * Partitions confirmed quotation revision lines into one-time lines and
 * recurring lines grouped by billingInterval.
 *
 * Invariant enforced:
 * - RECURRING products MUST have a non-null billingInterval (MONTHLY, QUARTERLY, or YEARLY).
 * - ONE_TIME products MUST NOT have a billingInterval.
 *
 * Fails deterministically if invalid product billing configuration is encountered.
 */
export function partitionLinesForBilling(
    lines: LineForBilling[],
): PartitionedBillingLines {
    const oneTimeLines: LineForBilling[] = [];
    const recurringGroups = new Map<BillingInterval, LineForBilling[]>();

    for (const line of lines) {
        const { billingType, billingInterval, name } = line.product;

        if (billingType === BillingType.RECURRING) {
            if (!billingInterval) {
                throw new BadRequestError(
                    `Product "${name}" is configured as RECURRING but is missing a valid billingInterval.`,
                );
            }
            const existing = recurringGroups.get(billingInterval) ?? [];
            existing.push(line);
            recurringGroups.set(billingInterval, existing);
        } else if (billingType === BillingType.ONE_TIME) {
            oneTimeLines.push(line);
        } else {
            throw new BadRequestError(
                `Product "${name}" has an unsupported billing type "${billingType}".`,
            );
        }
    }

    return {
        oneTimeLines,
        recurringGroups,
    };
}
