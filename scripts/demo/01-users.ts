import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "@/server/shared/db/prisma";
import { discountGovernanceService } from "@/server/modules/discount-governance/discount-governance.service";
import { DEMO_ORG, DEMO_PASSWORD, DEMO_USERS } from "./constants";
import type { AuthenticatedUser } from "@/server/modules/auth/auth.types";

export async function seedUsers(): Promise<{
    organizationId: string;
    organizationSlug: string;
    adminUser: AuthenticatedUser;
    salesManagerUser: AuthenticatedUser;
    salesRepUser: AuthenticatedUser;
    financeUser: AuthenticatedUser;
}> {
    console.log("--> Stage 1: Initializing Organization & Internal Demo Users...");

    // 1. Find or create demo organization
    const org = await prisma.organization.upsert({
        where: { slug: DEMO_ORG.slug },
        update: { name: DEMO_ORG.name },
        create: {
            name: DEMO_ORG.name,
            slug: DEMO_ORG.slug,
        },
    });

    // 2. Ensure default discount governance (policies and tier rules)
    await discountGovernanceService.ensureDefaultGovernance(org.id);

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

    // 3. Helper to safely find or create demo user strictly within demo org
    async function resolveInternalUser(
        email: string,
        name: string,
        role: UserRole,
    ): Promise<AuthenticatedUser> {
        const existing = await prisma.user.findUnique({
            where: { email },
        });

        if (existing) {
            // Verify existing user belongs to this demo organization before updating
            if (existing.organizationId !== org.id) {
                throw new Error(
                    `[SAFETY VIOLATION] User with email ${email} belongs to a different organization (${existing.organizationId}). Refusing to overwrite.`,
                );
            }

            const updated = await prisma.user.update({
                where: { id: existing.id },
                data: {
                    name,
                    role,
                    isActive: true,
                },
            });

            return {
                id: updated.id,
                organizationId: org.id,
                name: updated.name,
                email: updated.email,
                role: updated.role,
            };
        }

        const created = await prisma.user.create({
            data: {
                organizationId: org.id,
                email,
                name,
                passwordHash,
                role,
                isActive: true,
            },
        });

        return {
            id: created.id,
            organizationId: org.id,
            name: created.name,
            email: created.email,
            role: created.role,
        };
    }

    const adminUser = await resolveInternalUser(
        DEMO_USERS.admin.email,
        DEMO_USERS.admin.name,
        UserRole.ADMIN,
    );

    const salesManagerUser = await resolveInternalUser(
        DEMO_USERS.salesManager.email,
        DEMO_USERS.salesManager.name,
        UserRole.SALES_MANAGER,
    );

    const salesRepUser = await resolveInternalUser(
        DEMO_USERS.salesRep.email,
        DEMO_USERS.salesRep.name,
        UserRole.SALES_REP,
    );

    const financeUser = await resolveInternalUser(
        DEMO_USERS.finance.email,
        DEMO_USERS.finance.name,
        UserRole.FINANCE_OPERATIONS,
    );

    console.log(`    ✓ Demo Org: ${org.name} (${org.slug})`);
    console.log(`    ✓ Admin: ${adminUser.email} (Role: ${adminUser.role})`);
    console.log(`    ✓ Sales Manager: ${salesManagerUser.email} (Role: ${salesManagerUser.role})`);
    console.log(`    ✓ Sales Rep: ${salesRepUser.email} (Role: ${salesRepUser.role})`);
    console.log(`    ✓ Finance: ${financeUser.email} (Role: ${financeUser.role})`);

    return {
        organizationId: org.id,
        organizationSlug: org.slug,
        adminUser,
        salesManagerUser,
        salesRepUser,
        financeUser,
    };
}
