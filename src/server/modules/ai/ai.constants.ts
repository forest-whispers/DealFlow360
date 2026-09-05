import { env } from "@/server/shared/config/env";

export const AI_DEFAULT_TIMEOUT_MS = 12000;
export const AI_DEFAULT_TEMPERATURE = 0.2;

/**
 * Default model sourced exclusively from the environment configuration layer.
 */
export const AI_DEFAULT_MODEL = env.GEMINI_MODEL;

export const AIErrorCode = {
    AI_CONFIGURATION_ERROR: "AI_CONFIGURATION_ERROR",
    AI_PROVIDER_ERROR: "AI_PROVIDER_ERROR",
    AI_TIMEOUT: "AI_TIMEOUT",
    AI_INVALID_RESPONSE: "AI_INVALID_RESPONSE",
    AI_RATE_LIMITED: "AI_RATE_LIMITED",
} as const;

export type AIErrorCode = (typeof AIErrorCode)[keyof typeof AIErrorCode];
