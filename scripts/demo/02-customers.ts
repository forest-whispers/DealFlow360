import { CustomerTier, UserRole } from "@prisma/client";
import { prisma } from "@/server/shared/db/prisma";
import { customerService, mapCustomerToResponse } from "@/server/modules/customers/customer.service";
import { DEMO_CUSTOMERS, DEMO_PASSWORD } from "./constants";
import type { AuthenticatedUser } from "@/server/modules/auth/auth.types";
import type { CustomerResponse } from "@/server/modules/customers/customer.types";
import type { DemoCustomers } from "./types";

export async function seedCustomers(
    adminUser: AuthenticatedUser,
): Promise<{
    customers: DemoCustomers;
    customerActors: {
        bronze: AuthenticatedUser;
        silver: AuthenticatedUser;
        gold: AuthenticatedUser;
    };
}> {
    console.log("--> Stage 2: Provisioning Demo Customers via Customer Domain Service...");

    async function resolveCustomer(
        name: string,
        email: string,
        tier: CustomerTier,
        profile: Record<string, unknown>,
    ): Promise<{ customer: CustomerResponse; actor: AuthenticatedUser }> {
        const existing = await prisma.user.findUnique({
            where: { email },
        });

        if (existing) {
            if (existing.organizationId !== adminUser.organizationId) {
                throw new Error(
                    `[SAFETY VIOLATION] Customer ${email} already exists in another organization (${existing.organizationId}). Refusing to overwrite.`,
                );
            }
            if (existing.role !== UserRole.CUSTOMER) {
                throw new Error(
                    `[SAFETY VIOLATION] User ${email} exists but is not in CUSTOMER role. Customer creation domain flow was bypassed.`,
                );
            }

            const response = mapCustomerToResponse(existing);
            const actor: AuthenticatedUser = {
                id: existing.id,
                organizationId: existing.organizationId,
                name: existing.name,
                email: existing.email,
                role: existing.role,
            };

            return { customer: response, actor };
        }

        // Invoke canonical domain service
        const createdCustomer = await customerService.createCustomer(adminUser, {
            name,
            email,
            password: DEMO_PASSWORD,
            customerTier: tier,
            customerProfile: profile,
        });

        const actor: AuthenticatedUser = {
            id: createdCustomer.id,
            organizationId: adminUser.organizationId,
            name: createdCustomer.name,
            email: createdCustomer.email,
            role: UserRole.CUSTOMER,
        };

        return { customer: createdCustomer, actor };
    }

    const bronze = await resolveCustomer(
        DEMO_CUSTOMERS.bronze.name,
        DEMO_CUSTOMERS.bronze.email,
        CustomerTier.BRONZE,
        {
            company: DEMO_CUSTOMERS.bronze.company,
            industry: DEMO_CUSTOMERS.bronze.industry,
            companySize: DEMO_CUSTOMERS.bronze.companySize,
        },
    );

    const silver = await resolveCustomer(
        DEMO_CUSTOMERS.silver.name,
        DEMO_CUSTOMERS.silver.email,
        CustomerTier.SILVER,
        {
            company: DEMO_CUSTOMERS.silver.company,
            industry: DEMO_CUSTOMERS.silver.industry,
            companySize: DEMO_CUSTOMERS.silver.companySize,
        },
    );

    const gold = await resolveCustomer(
        DEMO_CUSTOMERS.gold.name,
        DEMO_CUSTOMERS.gold.email,
        CustomerTier.GOLD,
        {
            company: DEMO_CUSTOMERS.gold.company,
            industry: DEMO_CUSTOMERS.gold.industry,
            companySize: DEMO_CUSTOMERS.gold.companySize,
        },
    );

    console.log(`    ✓ Customer Bronze: ${bronze.customer.name} (${bronze.customer.email}) [Tier: ${bronze.customer.customerTier}]`);
    console.log(`    ✓ Customer Silver: ${silver.customer.name} (${silver.customer.email}) [Tier: ${silver.customer.customerTier}]`);
    console.log(`    ✓ Customer Gold: ${gold.customer.name} (${gold.customer.email}) [Tier: ${gold.customer.customerTier}]`);

    return {
        customers: {
            bronze: bronze.customer,
            silver: silver.customer,
            gold: gold.customer,
        },
        customerActors: {
            bronze: bronze.actor,
            silver: silver.actor,
            gold: gold.actor,
        },
    };
}
