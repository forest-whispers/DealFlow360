/**
 * AI Deal Copilot Constants (V1)
 */

export const CopilotIntentType = {
    DEAL_SUMMARY: "DEAL_SUMMARY",
    DEAL_RISK: "DEAL_RISK",
    NEXT_ACTION: "NEXT_ACTION",
    UPSELL: "UPSELL",
    NEGOTIATION_ADVICE: "NEGOTIATION_ADVICE",
    UNSUPPORTED: "UNSUPPORTED",
} as const;

export type CopilotIntentType =
    (typeof CopilotIntentType)[keyof typeof CopilotIntentType];

export const CopilotEvidenceSource = {
    DEAL_HEALTH: "DEAL_HEALTH",
    RISK_EXPLANATION: "RISK_EXPLANATION",
    NEGOTIATION_PREVIEW: "NEGOTIATION_PREVIEW",
    UPSELL: "UPSELL",
    DEAL_CONTEXT: "DEAL_CONTEXT",
} as const;

export type CopilotEvidenceSource =
    (typeof CopilotEvidenceSource)[keyof typeof CopilotEvidenceSource];

export const COPILOT_DEFAULT_TIMEOUT_MS = 15000;

/**
 * Non-production mock modes for deterministic testing without external API calls.
 */
export const COPILOT_MOCK_MODES = {
    SUMMARY: "MOCK_COPILOT_SUMMARY",
    RISK: "MOCK_COPILOT_RISK",
    NEXT_ACTION: "MOCK_COPILOT_NEXT_ACTION",
    UPSELL: "MOCK_COPILOT_UPSELL",
    NEGOTIATION: "MOCK_COPILOT_NEGOTIATION",
    UNSUPPORTED: "MOCK_COPILOT_UNSUPPORTED",
    TIMEOUT: "MOCK_COPILOT_TIMEOUT",
    PROVIDER_ERROR: "MOCK_COPILOT_PROVIDER_ERROR",
    INVALID_RESPONSE: "MOCK_COPILOT_INVALID_RESPONSE",
} as const;
