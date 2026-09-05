import {
    ChangeRequestStatus,
    NegotiationMessageAuthorType,
    NegotiationStatus,
    QuotationRevisionStatus,
    QuotationStatus,
} from "@prisma/client";

export {
    ChangeRequestStatus,
    NegotiationMessageAuthorType,
    NegotiationStatus,
    QuotationRevisionStatus,
    QuotationStatus,
};

export const PORTAL_VIEWABLE_QUOTATION_STATUSES: QuotationStatus[] = [
    QuotationStatus.SENT,
    QuotationStatus.UNDER_NEGOTIATION,
    QuotationStatus.APPROVED,
    QuotationStatus.CONFIRMED,
];

export const NEGOTIABLE_QUOTATION_STATUSES: QuotationStatus[] = [
    QuotationStatus.SENT,
    QuotationStatus.UNDER_NEGOTIATION,
];

export const DEFAULT_PORTAL_PAGE = 1;
export const DEFAULT_PORTAL_LIMIT = 20;
export const MAX_PORTAL_LIMIT = 50;
