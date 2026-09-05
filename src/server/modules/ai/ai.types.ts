import { z } from "zod";
import {
    ApprovalRequestStatus,
    ApprovalStepLevel,
    CustomerTier,
    FulfillmentStatus,
    InvoiceStatus,
    NegotiationStatus,
    QuotationStatus,
} from "@prisma/client";
import { DealHealthStatus } from "@/server/modules/deal-intelligence/deal-intelligence.types";

/**
 * Provider-agnostic input passed to an AIProvider.
 */
export interface StructuredGenerationInput {
    systemInstruction: string;
    userPrompt: string;
    /**
     * Optional provider-specific schema (e.g. JSON schema object) to guide structured output generation.
     */
    responseSchema?: unknown;
    temperature?: number;
}

/**
 * Interface implemented by LLM providers (e.g., GeminiProvider).
 * Note: The provider returns the parsed raw JSON response (`unknown`).
 * Semantic and schema validation is performed by the AIService using Zod.
 */
export interface AIProvider {
    generateStructured(input: StructuredGenerationInput): Promise<unknown>;
}

/**
 * Application-level options passed to AIService.generateStructured<T>.
 */
export interface GenerateStructuredOptions<T> {
    systemInstruction: string;
    userPrompt: string;
    /**
     * Authoritative application-side Zod validation schema.
     */
    schema: z.ZodType<T>;
    /**
     * Optional provider-specific schema for structured output guiding.
     */
    responseSchema?: unknown;
    temperature?: number;
    timeoutMs?: number;
}

// ==========================================================
// Allowlisted AI Deal Context Types
// ==========================================================

export interface AIDealQuotation {
    quoteNumber: string;
    status: QuotationStatus;
    total: number;
    marginPercent: number;
    blendedDiscountPercent: number;
}

export interface AIDealCustomer {
    tier: CustomerTier | null;
}

export interface AIDealDiscount {
    status: string | null;
    approvalLevel: string | null;
    effectiveLimit: number | null;
}

export interface AIDealApproval {
    status: ApprovalRequestStatus | null;
    pendingLevel: ApprovalStepLevel | null;
}

export interface AIDealNegotiation {
    status: NegotiationStatus | null;
    pendingChangeRequests: number;
}

export interface AIDealFulfillment {
    status: FulfillmentStatus | null;
    requiredQuantity: number;
    allocatedQuantity: number;
}

export interface AIDealBilling {
    invoiceStatus: InvoiceStatus | null;
    invoiceTotal: number;
    subscriptionCount: number;
}

export interface AIDealHealthFactor {
    type: string;
    severity: string;
    impact: number;
    message: string;
}

export interface AIDealHealth {
    score: number;
    status: DealHealthStatus;
    factors: AIDealHealthFactor[];
}

/**
 * Compact, allowlisted AI context representation for quotations.
 * Strictly free of internal database IDs, passwords, emails, tenant metadata, or raw Prisma entities.
 */
export interface AIDealContext {
    deal: AIDealQuotation;
    customer: AIDealCustomer;
    discount: AIDealDiscount;
    approval: AIDealApproval;
    negotiation: AIDealNegotiation;
    fulfillment: AIDealFulfillment;
    billing: AIDealBilling;
    health: AIDealHealth;
}
