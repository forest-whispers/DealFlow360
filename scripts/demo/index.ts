import "dotenv/config";
import { prisma } from "@/server/shared/db/prisma";
import { seedUsers } from "./01-users";
import { seedCustomers } from "./02-customers";
import { seedProducts } from "./03-products";
import { seedWarehouses } from "./04-warehouses";
import { seedInventory } from "./05-inventory";
import { seedQuotations } from "./06-quotations";
import { seedFulfillments } from "./07-fulfillment";
import { seedBilling } from "./08-billing";
import { cleanupDemoOrganization } from "./cleanup";
import { DEMO_PASSWORD } from "./constants";
import type { DemoActors, DemoQuotationSummary, SeedContext } from "./types";

async function main() {
    console.log("================================================================================");
    console.log("             DEALFLOW360 COMPREHENSIVE DEMO & MOCK DATA SEEDING                ");
    console.log("================================================================================");

    const isCleanMode =
        process.argv.includes("--clean") || process.env.CLEAN_DEMO === "true";

    if (isCleanMode) {
        await cleanupDemoOrganization();
    }

    // Stage 1: Organization and Internal Users
    const usersResult = await seedUsers();

    // Stage 2: Customers via Customer Domain Flow
    const customersResult = await seedCustomers(usersResult.adminUser);

    const actors: DemoActors = {
        admin: usersResult.adminUser,
        salesManager: usersResult.salesManagerUser,
        salesRep: usersResult.salesRepUser,
        finance: usersResult.financeUser,
        bronzeCustomer: customersResult.customerActors.bronze,
        silverCustomer: customersResult.customerActors.silver,
        goldCustomer: customersResult.customerActors.gold,
    };

    // Stage 3: Product Catalog & Governance Rules
    const products = await seedProducts(actors.admin);

    // Stage 4: Strategic Warehouses
    const warehouses = await seedWarehouses(actors.admin);

    // Stage 5: Deterministic Inventory Stocking
    await seedInventory(products, warehouses);

    // Stage 6: Quotation Lifecycles (Draft, SM Approval, Multi-step Approval, Sent, Negotiations)
    const quoteSummaries: DemoQuotationSummary[] = await seedQuotations(actors, products);

    // Stage 7: Authoritative Fulfillment (Multi-Warehouse Split & Shortage)
    const fulfillmentSummaries: DemoQuotationSummary[] = await seedFulfillments(actors, products);
    quoteSummaries.push(...fulfillmentSummaries);

    // Stage 8: Authoritative Billing, Invoicing, Payments & Subscriptions
    const billingSummaries: DemoQuotationSummary[] = await seedBilling(actors, products);
    quoteSummaries.push(...billingSummaries);

    const context: SeedContext = {
        organizationId: usersResult.organizationId,
        organizationSlug: usersResult.organizationSlug,
        actors,
        customers: customersResult.customers,
        products,
        warehouses,
        quotations: quoteSummaries,
    };

    // =========================================================================
    // Reporting & Summary
    // =========================================================================
    console.log("\n================================================================================");
    console.log("                       DEMO SEEDING COMPLETED SUCCESSFULLY                      ");
    console.log("================================================================================");

    console.log("\n[ORGANIZATION]");
    console.log(`  Name: DealFlow360 Demo Corp`);
    console.log(`  Slug: ${context.organizationSlug}`);
    console.log(`  ID:   ${context.organizationId}`);

    console.log("\n[DEMO USERS & ROLES] (Development Password: " + DEMO_PASSWORD + ")");
    console.log("  -----------------------------------------------------------------------------");
    console.log("  Role                  Name                      Email");
    console.log("  -----------------------------------------------------------------------------");
    console.log(`  ADMIN                 ${actors.admin.name.padEnd(25)} ${actors.admin.email}`);
    console.log(`  SALES_MANAGER         ${actors.salesManager.name.padEnd(25)} ${actors.salesManager.email}`);
    console.log(`  SALES_REP             ${actors.salesRep.name.padEnd(25)} ${actors.salesRep.email}`);
    console.log(`  FINANCE_OPERATIONS    ${actors.finance.name.padEnd(25)} ${actors.finance.email}`);
    console.log(`  CUSTOMER (Bronze)     ${actors.bronzeCustomer.name.padEnd(25)} ${actors.bronzeCustomer.email}`);
    console.log(`  CUSTOMER (Silver)     ${actors.silverCustomer.name.padEnd(25)} ${actors.silverCustomer.email}`);
    console.log(`  CUSTOMER (Gold)       ${actors.goldCustomer.name.padEnd(25)} ${actors.goldCustomer.email}`);
    console.log("  -----------------------------------------------------------------------------");

    console.log("\n[WAREHOUSES]");
    console.log(`  WH-NORTH (Priority 1) -> ${warehouses.north.name} (Active)`);
    console.log(`  WH-SOUTH (Priority 2) -> ${warehouses.south.name} (Active)`);
    console.log(`  WH-EAST  (Priority 3) -> ${warehouses.east.name} (Active)`);

    console.log("\n[DEMO QUOTATIONS & WORKSPACE LIFECYCLE MATRIX]");
    console.log("  -------------------------------------------------------------------------------------------------------");
    console.log("  Scenario Label               Quote #        Status             Tier    Revision  Demo Purpose");
    console.log("  -------------------------------------------------------------------------------------------------------");
    for (const q of context.quotations) {
        console.log(
            `  ${q.scenario.padEnd(28)} ` +
            `${q.quoteNumber.padEnd(14)} ` +
            `${q.status.padEnd(18)} ` +
            `${q.customerTier.padEnd(7)} ` +
            `Rev ${q.revisionNumber}     ` +
            `${q.details}`,
        );
    }
    console.log("  -------------------------------------------------------------------------------------------------------");
    console.log("\nAll lifecycle-sensitive records were authoritatively generated using real application domain services.");
    console.log("To clean and re-run from scratch: npm run seed:clean\n");
}

main()
    .catch((err) => {
        console.error("\n[FATAL SEED ERROR]:", err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
