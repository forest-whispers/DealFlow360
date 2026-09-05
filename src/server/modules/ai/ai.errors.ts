import { AppError } from "@/server/shared/errors/AppError";
import { AIErrorCode } from "./ai.constants";

export class AIError extends AppError {
    constructor(
        message: string,
        public readonly code: AIErrorCode,
        statusCode: number
    ) {
        super(message, statusCode);
        this.name = this.constructor.name;
    }
}

export class AIConfigurationError extends AIError {
    constructor(message = "AI service is not configured or missing required credentials.") {
        super(message, AIErrorCode.AI_CONFIGURATION_ERROR, 500);
    }
}

export class AIProviderError extends AIError {
    constructor(message = "AI provider encountered an error while processing the request.") {
        super(message, AIErrorCode.AI_PROVIDER_ERROR, 502);
    }
}

export class AITimeoutError extends AIError {
    constructor(message = "AI request timed out.") {
        super(message, AIErrorCode.AI_TIMEOUT, 504);
    }
}

export class AIInvalidResponseError extends AIError {
    constructor(message = "AI response did not match expected structure or schema.") {
        super(message, AIErrorCode.AI_INVALID_RESPONSE, 502);
    }
}

export class AIRateLimitedError extends AIError {
    constructor(message = "AI service rate limit exceeded. Please retry later.") {
        super(message, AIErrorCode.AI_RATE_LIMITED, 429);
    }
}
