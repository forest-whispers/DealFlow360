import type { AuthenticatedUser } from "@/server/modules/auth/auth.types";
import { dealContextService } from "./deal-context.service";
import { calculateDealHealth } from "./deal-health.calculation";
import type {
    DealContext,
    DealHealthResult,
} from "./deal-intelligence.types";

export class DealIntelligenceService {
    /**
     * Gathers and returns the authoritative DealContext for a quotation.
     * Guaranteed to be read-only and contain NO health scores, statuses, or risk factors.
     */
    async getDealContext(
        user: AuthenticatedUser,
        quotationId: string,
    ): Promise<DealContext> {
        return dealContextService.getDealContext(user, quotationId);
    }

    /**
     * Evaluates and returns the deterministic DealHealthResult for a quotation.
     * Evaluates authoritative deal facts against multi-dimensional risk rules.
     * Derived purely in-memory; zero database persistence.
     */
    async getDealHealth(
        user: AuthenticatedUser,
        quotationId: string,
    ): Promise<DealHealthResult> {
        const { input } = await dealContextService.getDealContextData(
            user,
            quotationId,
        );

        return calculateDealHealth(input);
    }

    /**
     * Resolves both authoritative DealContext and DealHealthResult in a single database read path.
     * Prevents redundant round-trips when generating AI prompts.
     */
    async getDealIntelligence(
        user: AuthenticatedUser,
        quotationId: string,
    ): Promise<{ context: DealContext; health: DealHealthResult }> {
        const { dealContext, input } = await dealContextService.getDealContextData(
            user,
            quotationId,
        );
        const health = calculateDealHealth(input);
        return { context: dealContext, health };
    }
}

export const dealIntelligenceService = new DealIntelligenceService();
