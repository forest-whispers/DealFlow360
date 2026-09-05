import { DealHealthStatus, DealRiskFactor } from "@/server/modules/deal-intelligence/deal-intelligence.types";

export function buildRiskExplanationSystemInstruction(): string {
    return [
        "You are DealFlow360's sales deal intelligence assistant.",
        "",
        "Your job is to explain the deterministic health assessment of a B2B deal and provide practical recommendations grounded only in supplied context.",
        "",
        "The deal health score, risk factors, margins, discounts, approval states, fulfillment states, and billing states are authoritative.",
        "Do not recalculate or contradict them.",
        "",
        "Do not invent:",
        "- products",
        "- prices",
        "- discounts",
        "- approval requirements",
        "- customer information",
        "- inventory",
        "- billing information",
        "- business rules",
        "",
        "Recommendations must be actionable but must NOT introduce unsupported commercial terms.",
        "For example, do not recommend a specific discount percentage, product, price, payment term, approval outcome, or operational action unless that information is explicitly present in the supplied context.",
        "",
        "Recommendations must directly address observed risk factors (or focus on progressing healthy deals to confirmation and closure).",
        "",
        "Return only the requested structured response matching the schema.",
    ].join("\n");
}

export function buildRiskExplanationUserPrompt(
    formattedContext: string,
    healthStatus: DealHealthStatus,
    healthScore: number,
    sortedFactors: DealRiskFactor[]
): string {
    const isHealthy = healthStatus === DealHealthStatus.HEALTHY;

    if (isHealthy) {
        return [
            formattedContext,
            "",
            `Assessment: The deal is HEALTHY (Score: ${healthScore}/100).`,
            "",
            "Instructions:",
            "1. In 'summary', explain why this deal is healthy based only on the supplied context.",
            "2. Do not manufacture or invent risks. 'keyRisks' MUST be an empty array ([]).",
            "3. In 'recommendedActions', provide 1 to 5 practical next steps focusing on progressing and closing the deal without inventing commercial terms.",
            "4. Each recommendation's 'priority' must be a strictly sequential integer starting at 1 (1, 2, ... N).",
        ].join("\n");
    }

    const factorDescriptions = sortedFactors
        .map((f, idx) => `${idx + 1}. [${f.severity}] ${f.type} (-${f.impact} pts): ${f.message}`)
        .join("\n");

    return [
        formattedContext,
        "",
        `Assessment: The deal has status ${healthStatus} (Score: ${healthScore}/100).`,
        "",
        "Authoritative Risk Factors:",
        factorDescriptions,
        "",
        "Instructions:",
        "1. In 'summary', explain the overall deal health and the business implications based only on the supplied context.",
        "2. In 'keyRisks', highlight the key risks among the supplied factors above.",
        "   - Every entry's 'factor' must correspond exactly to one of the supplied factor types.",
        "   - The 'severity' must match the authoritative severity of that factor exactly.",
        "   - Do not return duplicate entries for the same risk factor.",
        "   - Prioritize higher-severity factors first.",
        "3. In 'recommendedActions', provide 1 to 5 practical, actionable next steps to mitigate these observed risks without introducing unsupported commercial terms.",
        "4. Each recommendation's 'priority' must be a strictly sequential integer starting at 1 (1, 2, ... N).",
    ].join("\n");
}
