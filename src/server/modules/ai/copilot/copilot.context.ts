/**
 * AI Deal Copilot Context Formatting (V1)
 *
 * Provides capability-scoped, allowlisted fact formatters.
 * Completely strips all internal database IDs, passwords, and sensitive metadata.
 * Generates verified authoritative fact lists to enable semantic citation grounding.
 */

import type {
    CopilotNextActionFacts,
    CopilotNegotiationFacts,
    CopilotRiskFacts,
    CopilotSummaryFacts,
    CopilotUpsellFacts,
} from "./copilot.types";

export interface FormattedCapabilityContext {
    text: string;
    verbatimFacts: string[];
}

/**
 * Formats DEAL_SUMMARY facts.
 */
export function formatSummaryFacts(facts: CopilotSummaryFacts): FormattedCapabilityContext {
    const verbatimFacts: string[] = [
        `Quote Number: ${facts.quoteNumber}`,
        `Quotation Status: ${facts.status}`,
        `Revision Number: ${facts.revisionNumber}`,
        `Customer Tier: ${facts.customerTier ?? "Standard"}`,
        `Total Deal Value: $${facts.total.toFixed(2)}`,
        `Profit Margin: $${facts.margin.toFixed(2)} (${facts.marginPercent.toFixed(2)}%)`,
        `Blended Discount: ${facts.blendedDiscountPercent.toFixed(2)}%`,
        `Discount Governance Status: ${facts.discountStatus}`,
        `Required Approval Level: ${facts.approvalLevel}`,
        `Workflow Approval Status: ${facts.approvalStatus}`,
        facts.pendingApprovalLevel ? `Pending Approver: ${facts.pendingApprovalLevel}` : "Pending Approver: None",
        `Negotiation Status: ${facts.negotiationStatus}`,
        `Pending Customer Change Requests: ${facts.pendingChangeRequests}`,
        facts.fulfillmentStatus ? `Fulfillment Status: ${facts.fulfillmentStatus}` : "Fulfillment Status: None",
        facts.invoiceStatus ? `Invoice Status: ${facts.invoiceStatus}` : "Invoice Status: None",
    ];

    const text = [
        "### Authoritative Deal Summary Facts",
        `- Quote Number: ${facts.quoteNumber} (Revision ${facts.revisionNumber})`,
        `- Lifecycle Status: ${facts.status}`,
        `- Customer Tier: ${facts.customerTier ?? "Standard"}`,
        `- Total Value: $${facts.total.toFixed(2)}`,
        `- Margin: $${facts.margin.toFixed(2)} (${facts.marginPercent.toFixed(2)}%)`,
        `- Blended Discount: ${facts.blendedDiscountPercent.toFixed(2)}%`,
        `- Governance Status: ${facts.discountStatus} (Approval Level: ${facts.approvalLevel})`,
        `- Approval Status: ${facts.approvalStatus}${facts.pendingApprovalLevel ? ` (Pending: ${facts.pendingApprovalLevel})` : ""}`,
        `- Negotiation State: ${facts.negotiationStatus} (${facts.pendingChangeRequests} pending change request(s))`,
        `- Fulfillment: ${facts.fulfillmentStatus ?? "Not Initiated"}`,
        `- Billing / Invoicing: ${facts.invoiceStatus ?? "Not Invoiced"}`,
    ].join("\n");

    return { text, verbatimFacts };
}

/**
 * Formats DEAL_RISK facts.
 */
export function formatRiskFacts(facts: CopilotRiskFacts): FormattedCapabilityContext {
    const verbatimFacts: string[] = [
        `Deal Health Score: ${facts.healthScore}/100`,
        `Deal Health Status: ${facts.healthStatus}`,
        `Risk Summary: ${facts.summary}`,
        ...facts.keyRisks.map(
            (r) => `${r.severity} Risk: ${r.factor} (Impact: -${r.impact} pts) - ${r.message}`,
        ),
        ...facts.recommendedActions.map((a) => `Recommended Action: ${a}`),
    ];

    const lines = [
        "### Authoritative Deal Risk & Health Facts",
        `- Health Score: ${facts.healthScore}/100 (${facts.healthStatus})`,
        `- Summary: ${facts.summary}`,
    ];

    if (facts.keyRisks.length > 0) {
        lines.push("#### Key Risk Factors:");
        for (const r of facts.keyRisks) {
            lines.push(`  * [${r.severity}] ${r.factor} (Impact: -${r.impact} pts): ${r.message}`);
        }
    } else {
        lines.push("- Key Risk Factors: None (Deal is healthy)");
    }

    if (facts.recommendedActions.length > 0) {
        lines.push("#### Recommended Actions:");
        for (const a of facts.recommendedActions) {
            lines.push(`  * ${a}`);
        }
    }

    return { text: lines.join("\n"), verbatimFacts };
}

/**
 * Formats NEXT_ACTION facts.
 */
export function formatNextActionFacts(facts: CopilotNextActionFacts): FormattedCapabilityContext {
    const verbatimFacts: string[] = [
        `Quotation Status: ${facts.status}`,
        `Health Status: ${facts.healthStatus}`,
        ...facts.blockers.map((b) => `Deal Blocker: ${b}`),
        ...facts.criticalFactors.map(
            (f) => `Critical Risk Factor: ${f.factor} - ${f.message}`,
        ),
    ];

    const lines = [
        "### Authoritative Next Action & Blocker Facts",
        `- Current Deal Status: ${facts.status}`,
        `- Health Status: ${facts.healthStatus}`,
    ];

    if (facts.blockers.length > 0) {
        lines.push("#### Active Blockers & Pending Steps:");
        for (const b of facts.blockers) {
            lines.push(`  * ${b}`);
        }
    } else {
        lines.push("- Active Blockers: None identified");
    }

    if (facts.criticalFactors.length > 0) {
        lines.push("#### High-Severity Factors Requiring Attention:");
        for (const f of facts.criticalFactors) {
            lines.push(`  * [${f.severity}] ${f.factor}: ${f.message}`);
        }
    }

    return { text: lines.join("\n"), verbatimFacts };
}

/**
 * Formats UPSELL facts.
 */
export function formatUpsellFacts(facts: CopilotUpsellFacts): FormattedCapabilityContext {
    const verbatimFacts: string[] = [
        `Upsell Summary: ${facts.summary}`,
        ...facts.recommendations.map(
            (r) => `Recommended Product: ${r.name} (${r.fit} Fit) - ${r.reason}`,
        ),
    ];

    const lines = [
        "### Authoritative Complementary Product Recommendations",
        `- Summary: ${facts.summary}`,
    ];

    if (facts.recommendations.length > 0) {
        lines.push("#### Recommended Additions:");
        for (const r of facts.recommendations) {
            lines.push(`  * ${r.name} [${r.fit} FIT]: ${r.reason}`);
        }
    } else {
        lines.push("- No complementary products currently eligible for recommendation.");
    }

    return { text: lines.join("\n"), verbatimFacts };
}

/**
 * Formats NEGOTIATION_ADVICE facts.
 */
export function formatNegotiationFacts(facts: CopilotNegotiationFacts): FormattedCapabilityContext {
    const verbatimFacts: string[] = [
        `Negotiation Interpretation: ${facts.interpretationStatus}`,
    ];

    const lines = [
        "### Authoritative Negotiation Commercial Preview Facts",
        `- Interpretation Status: ${facts.interpretationStatus}`,
    ];

    if (facts.governance) {
        verbatimFacts.push(`Governance Evaluation: ${facts.governance.status}`);
        verbatimFacts.push(`Required Approval Level: ${facts.governance.approvalLevel}`);
        if (facts.governance.message) {
            verbatimFacts.push(`Governance Note: ${facts.governance.message}`);
        }
        lines.push(
            `- Governance Evaluation: ${facts.governance.status} (Approval Level: ${facts.governance.approvalLevel})`,
        );
        if (facts.governance.message) {
            lines.push(`- Governance Message: ${facts.governance.message}`);
        }
    }

    if (facts.before && facts.after) {
        verbatimFacts.push(
            `Before: Total $${facts.before.total.toFixed(2)}, Margin ${facts.before.marginPercent.toFixed(2)}%, Discount ${facts.before.blendedDiscountPercent.toFixed(2)}%`,
        );
        verbatimFacts.push(
            `After: Total $${facts.after.total.toFixed(2)}, Margin ${facts.after.marginPercent.toFixed(2)}%, Discount ${facts.after.blendedDiscountPercent.toFixed(2)}%`,
        );
        lines.push(
            `- Current Total: $${facts.before.total.toFixed(2)} (Margin: ${facts.before.marginPercent.toFixed(2)}%, Blended Discount: ${facts.before.blendedDiscountPercent.toFixed(2)}%)`,
        );
        lines.push(
            `- Proposed Total: $${facts.after.total.toFixed(2)} (Margin: ${facts.after.marginPercent.toFixed(2)}%, Blended Discount: ${facts.after.blendedDiscountPercent.toFixed(2)}%)`,
        );
    }

    if (facts.changes.length > 0) {
        lines.push("#### Line Commercial Changes:");
        for (const ch of facts.changes) {
            verbatimFacts.push(
                `Line ${ch.lineNumber} (${ch.productName}): Qty ${ch.before.quantity} -> ${ch.after.quantity}, Discount ${ch.before.discountPercent}% -> ${ch.after.discountPercent}%, Total $${ch.before.lineTotal.toFixed(2)} -> $${ch.after.lineTotal.toFixed(2)}`,
            );
            lines.push(
                `  * Line ${ch.lineNumber} (${ch.productName}): Quantity ${ch.before.quantity} -> ${ch.after.quantity}, Discount ${ch.before.discountPercent}% -> ${ch.after.discountPercent}%, Line Total $${ch.before.lineTotal.toFixed(2)} -> $${ch.after.lineTotal.toFixed(2)}`,
            );
        }
    }

    return { text: lines.join("\n"), verbatimFacts };
}
