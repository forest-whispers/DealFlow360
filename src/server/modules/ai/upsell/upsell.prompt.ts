import type { AIUpsellContext } from "./upsell.types";

export function buildUpsellSystemInstruction(): string {
    return [
        "You are DealFlow360's sales recommendation assistant.",
        "",
        "Your task is to identify relevant complementary products from the supplied candidate list for the current quotation.",
        "",
        "The candidate list is authoritative.",
        "You may only recommend products present in the candidate list.",
        "",
        "Do not invent products, product IDs, prices, variants, availability, discounts, margins, approval rules, or business policies.",
        "Do not infer or speculate on unsupported facts such as customer purchasing history, product popularity, inventory availability, pricing competitiveness, margin impact, approval likelihood, or prior purchases.",
        "",
        "Base recommendations solely on the supplied inputs:",
        "- current quotation product mix",
        "- customer tier",
        "- product category",
        "- product description",
        "- billing characteristics",
        "- contextual compatibility",
        "",
        "Recommend only products that have a meaningful business fit for this deal.",
        "Do not recommend products merely to fill the response.",
        "If no suitable candidates exist or none are sufficiently relevant, return an empty recommendations array ([]).",
        "",
        "The backend will validate all product IDs against the authoritative candidate set.",
        "Return only the requested structured response matching the schema.",
    ].join("\n");
}

export function formatUpsellContextForPrompt(context: AIUpsellContext): string {
    const lines: string[] = [];

    lines.push("=== CURRENT DEAL CONTEXT ===");
    lines.push(`Customer Tier: ${context.customer.tier ?? "None"}`);
    lines.push(
        `Quotation Status: ${context.quotation.status} | Total: $${context.quotation.total.toFixed(2)} | Margin: ${context.quotation.marginPercent.toFixed(2)}% | Blended Discount: ${context.quotation.blendedDiscountPercent.toFixed(2)}%`
    );

    lines.push("");
    lines.push("=== CURRENT QUOTATION PRODUCTS ===");
    if (context.currentProducts.length === 0) {
        lines.push("(No products in current quotation)");
    } else {
        context.currentProducts.forEach((p, idx) => {
            lines.push(
                `${idx + 1}. [${p.category}] ${p.name} (Billing: ${p.billingType})`
            );
        });
    }

    lines.push("");
    lines.push("=== CANDIDATE PRODUCTS (AUTHORITATIVE) ===");
    if (context.candidates.length === 0) {
        lines.push("(No eligible candidate products available)");
    } else {
        // Preserve exact deterministic ordering from the service
        context.candidates.forEach((c, idx) => {
            const billingInfo =
                c.billingType === "RECURRING" && c.billingInterval
                    ? `RECURRING - ${c.billingInterval}`
                    : c.billingType;
            const desc = c.description ? ` - ${c.description}` : "";
            lines.push(
                `${idx + 1}. [Candidate ID: ${c.productId}] [${c.category}] ${c.name}${desc} (Billing: ${billingInfo})`
            );
        });
    }

    return lines.join("\n");
}

export function buildUpsellUserPrompt(context: AIUpsellContext): string {
    const formattedContext = formatUpsellContextForPrompt(context);

    return [
        formattedContext,
        "",
        "Instructions:",
        "1. In 'summary', provide a concise overview of the deal's product mix and the identified cross-sell / upsell opportunities.",
        "2. In 'recommendations', select at most 3 strongest complementary products from the Candidate Products list.",
        "3. For each recommendation:",
        "   - 'productId' MUST correspond exactly to one of the supplied Candidate IDs above.",
        "   - 'fit' must be HIGH, MEDIUM, or LOW based on contextual synergy with the current deal.",
        "   - 'reason' must explain why the product is a relevant complementary addition based only on the supplied context.",
        "4. Do NOT recommend any product that is already present in the Current Quotation Products list.",
        "5. Do NOT return duplicate recommendations for the same product ID.",
        "6. If no candidate products are sufficiently relevant, return an empty array ([]) for 'recommendations'.",
    ].join("\n");
}
