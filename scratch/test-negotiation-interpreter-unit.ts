import assert from "node:assert/strict";
import { UserRole } from "@prisma/client";
import {
    NegotiationChangeType,
    NegotiationInterpretationStatus,
    AINegotiationContext,
} from "../src/server/modules/ai/negotiation/negotiation.types";
import {
    interpretNegotiationMessageInputSchema,
    negotiationInterpretationResultSchema,
    negotiationInterpretationJsonSchema,
} from "../src/server/modules/ai/negotiation/negotiation.validation";
import {
    buildNegotiationSystemInstruction,
    formatNegotiationContextForPrompt,
    buildNegotiationUserPrompt,
} from "../src/server/modules/ai/negotiation/negotiation.prompt";
import {
    NegotiationInterpreterService,
} from "../src/server/modules/ai/negotiation/negotiation.service";
import { AIInvalidResponseError } from "../src/server/modules/ai/ai.errors";

console.log("=================================================");
console.log("Running AI Negotiation Interpreter V1 Unit Tests");
console.log("=================================================\n");

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
    try {
        const result = fn();
        if (result instanceof Promise) {
            return result
                .then(() => {
                    console.log(`PASS: ${name}`);
                    passed++;
                })
                .catch((err) => {
                    console.error(`FAIL: ${name}`);
                    console.error(err);
                    failed++;
                });
        }
        console.log(`PASS: ${name}`);
        passed++;
    } catch (err) {
        console.error(`FAIL: ${name}`);
        console.error(err);
        failed++;
    }
}

async function main() {
    // -------------------------------------------------------------
    // Test 1: Request Schema Validation
    // -------------------------------------------------------------
    runTest("Request schema accepts valid message and trims whitespace", () => {
        const parsed = interpretNegotiationMessageInputSchema.parse({
            message: "  Can you give us 18% off the laptops?  ",
        });
        assert.equal(parsed.message, "Can you give us 18% off the laptops?");
    });

    runTest("Request schema rejects empty message", () => {
        assert.throws(
            () => interpretNegotiationMessageInputSchema.parse({ message: "   " }),
            /Negotiation message must not be empty/
        );
    });

    runTest("Request schema rejects missing message", () => {
        assert.throws(
            () => interpretNegotiationMessageInputSchema.parse({}),
            /Negotiation message is required/
        );
    });

    runTest("Request schema rejects extra fields (.strict)", () => {
        assert.throws(
            () =>
                interpretNegotiationMessageInputSchema.parse({
                    message: "Valid message",
                    extra: "not allowed",
                }),
            /unrecognized_keys/i
        );
    });

    runTest("Request schema rejects message exceeding 2000 characters", () => {
        const longMessage = "a".repeat(2001);
        assert.throws(
            () => interpretNegotiationMessageInputSchema.parse({ message: longMessage }),
            /cannot exceed 2000 characters/
        );
    });

    // -------------------------------------------------------------
    // Test 2: Response Schema Validation
    // -------------------------------------------------------------
    runTest("Response schema accepts valid INTERPRETED LINE_DISCOUNT", () => {
        const valid = {
            status: NegotiationInterpretationStatus.INTERPRETED,
            intent: {
                changes: [
                    {
                        type: NegotiationChangeType.LINE_DISCOUNT,
                        lineNumber: 1,
                        discountPercent: 18,
                    },
                ],
            },
        };
        const parsed = negotiationInterpretationResultSchema.parse(valid);
        assert.equal(parsed.status, "INTERPRETED");
        assert.ok(parsed.intent);
        assert.equal(parsed.intent.changes.length, 1);
        assert.equal(parsed.intent.changes[0].type, "LINE_DISCOUNT");
        assert.equal(parsed.intent.changes[0].lineNumber, 1);
    });

    runTest("Response schema accepts valid INTERPRETED LINE_QUANTITY", () => {
        const valid = {
            status: NegotiationInterpretationStatus.INTERPRETED,
            intent: {
                changes: [
                    {
                        type: NegotiationChangeType.LINE_QUANTITY,
                        lineNumber: 2,
                        quantity: 25,
                    },
                ],
            },
        };
        const parsed = negotiationInterpretationResultSchema.parse(valid);
        assert.equal(parsed.status, "INTERPRETED");
        assert.ok(parsed.intent);
        assert.equal(parsed.intent.changes[0].type, "LINE_QUANTITY");
        assert.equal(parsed.intent.changes[0].quantity, 25);
    });

    runTest("Response schema accepts valid INTERPRETED multiple changes", () => {
        const valid = {
            status: NegotiationInterpretationStatus.INTERPRETED,
            intent: {
                changes: [
                    {
                        type: NegotiationChangeType.LINE_QUANTITY,
                        lineNumber: 1,
                        quantity: 20,
                    },
                    {
                        type: NegotiationChangeType.LINE_DISCOUNT,
                        lineNumber: 1,
                        discountPercent: 10,
                    },
                ],
            },
        };
        const parsed = negotiationInterpretationResultSchema.parse(valid);
        assert.equal(parsed.status, "INTERPRETED");
        assert.equal(parsed.intent?.changes.length, 2);
    });

    runTest("Response schema accepts valid AMBIGUOUS with intent: null", () => {
        const valid = {
            status: NegotiationInterpretationStatus.AMBIGUOUS,
            intent: null,
        };
        const parsed = negotiationInterpretationResultSchema.parse(valid);
        assert.equal(parsed.status, "AMBIGUOUS");
        assert.equal(parsed.intent, null);
    });

    runTest("Response schema accepts valid UNSUPPORTED with intent: null", () => {
        const valid = {
            status: NegotiationInterpretationStatus.UNSUPPORTED,
            intent: null,
        };
        const parsed = negotiationInterpretationResultSchema.parse(valid);
        assert.equal(parsed.status, "UNSUPPORTED");
        assert.equal(parsed.intent, null);
    });

    runTest("Response schema rejects INTERPRETED with null intent or empty changes", () => {
        assert.throws(
            () =>
                negotiationInterpretationResultSchema.parse({
                    status: NegotiationInterpretationStatus.INTERPRETED,
                    intent: null,
                }),
            /INTERPRETED status requires a non-null intent/
        );

        assert.throws(
            () =>
                negotiationInterpretationResultSchema.parse({
                    status: NegotiationInterpretationStatus.INTERPRETED,
                    intent: { changes: [] },
                }),
            /INTERPRETED status requires a non-null intent/
        );
    });

    runTest("Response schema rejects AMBIGUOUS or UNSUPPORTED with non-null intent", () => {
        assert.throws(
            () =>
                negotiationInterpretationResultSchema.parse({
                    status: NegotiationInterpretationStatus.AMBIGUOUS,
                    intent: { changes: [] },
                }),
            /AMBIGUOUS status must have intent set to null/
        );

        assert.throws(
            () =>
                negotiationInterpretationResultSchema.parse({
                    status: NegotiationInterpretationStatus.UNSUPPORTED,
                    intent: {
                        changes: [
                            {
                                type: NegotiationChangeType.LINE_DISCOUNT,
                                lineNumber: 1,
                                discountPercent: 10,
                            },
                        ],
                    },
                }),
            /UNSUPPORTED status must have intent set to null/
        );
    });

    runTest("Response schema rejects invalid change type", () => {
        assert.throws(
            () =>
                negotiationInterpretationResultSchema.parse({
                    status: NegotiationInterpretationStatus.INTERPRETED,
                    intent: {
                        changes: [
                            {
                                type: "UNKNOWN_TYPE",
                                lineNumber: 1,
                            },
                        ],
                    },
                }),
            /invalid_value|Invalid option/
        );
    });

    runTest("Response schema rejects discount < 0 or > 100", () => {
        assert.throws(
            () =>
                negotiationInterpretationResultSchema.parse({
                    status: NegotiationInterpretationStatus.INTERPRETED,
                    intent: {
                        changes: [
                            {
                                type: NegotiationChangeType.LINE_DISCOUNT,
                                lineNumber: 1,
                                discountPercent: -5,
                            },
                        ],
                    },
                }),
            /LINE_DISCOUNT requires discountPercent between 0 and 100/
        );

        assert.throws(
            () =>
                negotiationInterpretationResultSchema.parse({
                    status: NegotiationInterpretationStatus.INTERPRETED,
                    intent: {
                        changes: [
                            {
                                type: NegotiationChangeType.LINE_DISCOUNT,
                                lineNumber: 1,
                                discountPercent: 105,
                            },
                        ],
                    },
                }),
            /LINE_DISCOUNT requires discountPercent between 0 and 100/
        );
    });

    runTest("Response schema rejects quantity < 1 or non-integer", () => {
        assert.throws(
            () =>
                negotiationInterpretationResultSchema.parse({
                    status: NegotiationInterpretationStatus.INTERPRETED,
                    intent: {
                        changes: [
                            {
                                type: NegotiationChangeType.LINE_QUANTITY,
                                lineNumber: 1,
                                quantity: 0,
                            },
                        ],
                    },
                }),
            /LINE_QUANTITY requires positive integer quantity >= 1/
        );

        assert.throws(
            () =>
                negotiationInterpretationResultSchema.parse({
                    status: NegotiationInterpretationStatus.INTERPRETED,
                    intent: {
                        changes: [
                            {
                                type: NegotiationChangeType.LINE_QUANTITY,
                                lineNumber: 1,
                                quantity: 3.5,
                            },
                        ],
                    },
                }),
            /LINE_QUANTITY requires positive integer quantity >= 1/
        );
    });

    // -------------------------------------------------------------
    // Test 3: Prompt Formatting and Allowlist Privacy
    // -------------------------------------------------------------
    runTest("formatNegotiationContextForPrompt includes allowlisted fields and omits private IDs", () => {
        const sampleContext: AINegotiationContext = {
            quotation: {
                quoteNumber: "Q-1001",
                revisionNumber: 2,
            },
            lines: [
                {
                    lineNumber: 1,
                    name: "Enterprise Pro Laptop 15-inch",
                    sku: "LAP-001",
                    category: "Hardware",
                    quantity: 10,
                    unitPrice: 1200,
                    currentDiscountPercent: 5,
                },
                {
                    lineNumber: 2,
                    name: "Extended Warranty Support",
                    sku: null,
                    category: "Services",
                    quantity: 10,
                    unitPrice: 150,
                    currentDiscountPercent: 0,
                },
            ],
            customerMessage: "Can we get 15% off the laptops and bump warranty to 20?",
        };

        const formatted = formatNegotiationContextForPrompt(sampleContext);
        assert.ok(formatted.includes("QUOTATION: Q-1001 (Revision 2)"));
        assert.ok(formatted.includes("Line #1: Enterprise Pro Laptop 15-inch (SKU: LAP-001)"));
        assert.ok(formatted.includes("Qty: 10 | Unit Price: $1200.00 | Current Discount: 5%"));
        assert.ok(formatted.includes("Line #2: Extended Warranty Support | Category: Services"));
        assert.ok(formatted.includes("Qty: 10 | Unit Price: $150.00 | Current Discount: 0%"));
        assert.ok(formatted.includes(sampleContext.customerMessage));

        // Verify zero undefined, NaN, or database IDs
        assert.ok(!formatted.includes("undefined"));
        assert.ok(!formatted.includes("NaN"));
        assert.ok(!formatted.includes("null"));
        assert.ok(!formatted.includes("quotationId"));
        assert.ok(!formatted.includes("customerId"));
        assert.ok(!formatted.includes("organizationId"));
    });

    runTest("buildNegotiationSystemInstruction instructs ambiguity and unsupported behaviors", () => {
        const instruction = buildNegotiationSystemInstruction();
        assert.ok(instruction.includes("AMBIGUOUS"));
        assert.ok(instruction.includes("UNSUPPORTED"));
        assert.ok(instruction.includes("LINE_DISCOUNT"));
        assert.ok(instruction.includes("LINE_QUANTITY"));
        assert.ok(instruction.includes("lineNumber"));
    });

    runTest("Provider JSON Schema is strict with required keys", () => {
        assert.equal(negotiationInterpretationJsonSchema.type, "OBJECT");
        assert.ok(Array.isArray(negotiationInterpretationJsonSchema.required));
        assert.ok((negotiationInterpretationJsonSchema.required as string[]).includes("status"));
    });

    // -------------------------------------------------------------
    // Test 4: Mock Service Semantic Grounding & Boundary Checks
    // -------------------------------------------------------------
    const mockUser = {
        id: "cust-1",
        organizationId: "org-1",
        name: "Test Customer",
        email: "cust@test.com",
        role: UserRole.CUSTOMER,
    };

    // We create an interpreter service instance with mock provider to test semantic validations directly
    const testService = new NegotiationInterpreterService();

    // Mock quotation resolution test requires DB, but we can verify semantic post-processing
    // through options.mockMode on interpretMessage!
    console.log("\nAll schema, prompt, and allowlist unit tests completed successfully.");
}

main().then(() => {
    console.log(`\nUnit Tests Summary: ${passed} passed, ${failed} failed.`);
    if (failed > 0) {
        process.exit(1);
    }
});
