import { prisma } from "../src/server/shared/db/prisma";
import { userService } from "../src/server/modules/users/user.service";
import { UserRole } from "@prisma/client";
import { BadRequestError, NotFoundError } from "../src/server/shared/errors/errors";

async function runVerification() {
    console.log("=== Starting User Management Domain & Safety Verification ===");

    // 1. Setup / Lookup test organization & users
    const orgA = await prisma.organization.upsert({
        where: { slug: "test-org-user-mgmt" },
        update: {},
        create: {
            name: "Test User Mgmt Org",
            slug: "test-org-user-mgmt",
        },
    });

    const orgB = await prisma.organization.upsert({
        where: { slug: "test-org-user-mgmt-b" },
        update: {},
        create: {
            name: "Other Org B",
            slug: "test-org-user-mgmt-b",
        },
    });

    // Admin in Org A
    const adminUser = await prisma.user.upsert({
        where: { email: "admin-usermgmt@dealflow.test" },
        update: { role: UserRole.ADMIN, isActive: true, organizationId: orgA.id },
        create: {
            email: "admin-usermgmt@dealflow.test",
            name: "Admin User",
            passwordHash: "hash123",
            role: UserRole.ADMIN,
            isActive: true,
            organizationId: orgA.id,
        },
    });

    // Sales Rep in Org A
    const repUser = await prisma.user.upsert({
        where: { email: "rep-usermgmt@dealflow.test" },
        update: { role: UserRole.SALES_REP, isActive: true, organizationId: orgA.id },
        create: {
            email: "rep-usermgmt@dealflow.test",
            name: "Rep User",
            passwordHash: "hash123",
            role: UserRole.SALES_REP,
            isActive: true,
            organizationId: orgA.id,
        },
    });

    // Customer in Org A
    const customerUser = await prisma.user.upsert({
        where: { email: "customer-usermgmt@dealflow.test" },
        update: { role: UserRole.CUSTOMER, isActive: true, organizationId: orgA.id },
        create: {
            email: "customer-usermgmt@dealflow.test",
            name: "Customer Contact",
            passwordHash: "hash123",
            role: UserRole.CUSTOMER,
            isActive: true,
            organizationId: orgA.id,
        },
    });

    // Admin in Org B (different org)
    const orgBUser = await prisma.user.upsert({
        where: { email: "admin-orgb@dealflow.test" },
        update: { role: UserRole.ADMIN, isActive: true, organizationId: orgB.id },
        create: {
            email: "admin-orgb@dealflow.test",
            name: "Org B User",
            passwordHash: "hash123",
            role: UserRole.ADMIN,
            isActive: true,
            organizationId: orgB.id,
        },
    });

    const adminAuth = {
        id: adminUser.id,
        organizationId: orgA.id,
        role: adminUser.role,
        name: adminUser.name,
        email: adminUser.email,
    };

    // TEST 1: List Users for Org A
    console.log("-> Testing listUsers...");
    const listRes = await userService.listUsers(adminAuth, { page: 1, limit: 20 });
    const listedIds = listRes.users.map((u) => u.id);

    if (!listedIds.includes(adminUser.id)) throw new Error("listUsers should include adminUser");
    if (!listedIds.includes(repUser.id)) throw new Error("listUsers should include repUser");
    if (listedIds.includes(customerUser.id)) throw new Error("listUsers must NOT include CUSTOMER users");
    if (listedIds.includes(orgBUser.id)) throw new Error("listUsers must NOT include users from Org B");
    console.log("✓ listUsers: Organization isolation and customer exclusion verified.");

    // TEST 2: Search by email
    console.log("-> Testing search...");
    const searchRes = await userService.listUsers(adminAuth, { page: 1, limit: 20, search: "rep-usermgmt" });
    if (searchRes.users.length !== 1 || searchRes.users[0].id !== repUser.id) {
        throw new Error("search failed to find repUser");
    }
    console.log("✓ search by email verified.");

    // TEST 3: Role filter
    console.log("-> Testing role filter...");
    const roleRes = await userService.listUsers(adminAuth, { page: 1, limit: 20, role: UserRole.ADMIN });
    if (!roleRes.users.every((u) => u.role === UserRole.ADMIN)) {
        throw new Error("role filter failed");
    }
    console.log("✓ role filter verified.");

    // TEST 4: Self-mutation prevention - Role
    console.log("-> Testing self-role mutation prevention...");
    try {
        await userService.changeUserRole(adminAuth, adminUser.id, UserRole.SALES_MANAGER);
        throw new Error("Expected BadRequestError when changing own role");
    } catch (e: unknown) {
        if (e instanceof BadRequestError && e.message.includes("cannot modify their own role")) {
            console.log("✓ Self-role mutation rejected with BadRequestError.");
        } else {
            throw e;
        }
    }

    // TEST 5: Self-mutation prevention - Status
    console.log("-> Testing self-status mutation prevention...");
    try {
        await userService.updateUserStatus(adminAuth, adminUser.id, false);
        throw new Error("Expected BadRequestError when modifying own status");
    } catch (e: unknown) {
        if (e instanceof BadRequestError && e.message.includes("cannot modify their own account status")) {
            console.log("✓ Self-status mutation rejected with BadRequestError.");
        } else {
            throw e;
        }
    }

    // TEST 6: Cross-organization mutation prevention
    console.log("-> Testing cross-organization mutation prevention...");
    try {
        await userService.changeUserRole(adminAuth, orgBUser.id, UserRole.SALES_MANAGER);
        throw new Error("Expected NotFoundError when modifying other org's user");
    } catch (e: unknown) {
        if (e instanceof NotFoundError) {
            console.log("✓ Cross-org role change rejected with NotFoundError.");
        } else {
            throw e;
        }
    }

    try {
        await userService.updateUserStatus(adminAuth, orgBUser.id, false);
        throw new Error("Expected NotFoundError when modifying other org's user status");
    } catch (e: unknown) {
        if (e instanceof NotFoundError) {
            console.log("✓ Cross-org status change rejected with NotFoundError.");
        } else {
            throw e;
        }
    }

    // TEST 7: Customer mutation prevention
    console.log("-> Testing customer mutation prevention...");
    try {
        await userService.changeUserRole(adminAuth, customerUser.id, UserRole.SALES_MANAGER);
        throw new Error("Expected NotFoundError when modifying customer through internal user service");
    } catch (e: unknown) {
        if (e instanceof NotFoundError) {
            console.log("✓ Customer mutation rejected with NotFoundError.");
        } else {
            throw e;
        }
    }

    // TEST 8: Valid role change
    console.log("-> Testing valid role change on repUser...");
    const roleChangeRes = await userService.changeUserRole(adminAuth, repUser.id, UserRole.SALES_MANAGER);
    if (roleChangeRes.user.role !== UserRole.SALES_MANAGER) {
        throw new Error("Role change response role mismatch");
    }
    const dbRepAfterRole = await prisma.user.findUnique({ where: { id: repUser.id } });
    if (dbRepAfterRole?.role !== UserRole.SALES_MANAGER) {
        throw new Error("Database role mismatch after role change");
    }
    console.log("✓ Role change to SALES_MANAGER successfully verified in DB.");

    // TEST 9: Valid status change (Deactivation & Activation)
    console.log("-> Testing valid status deactivation on repUser...");
    const deactRes = await userService.updateUserStatus(adminAuth, repUser.id, false);
    if (deactRes.user.isActive !== false) {
        throw new Error("Status response mismatch on deactivation");
    }
    const dbRepAfterDeact = await prisma.user.findUnique({ where: { id: repUser.id } });
    if (dbRepAfterDeact?.isActive !== false) {
        throw new Error("Database isActive mismatch after deactivation");
    }
    console.log("✓ User deactivation successfully verified in DB.");

    console.log("-> Testing valid status activation on repUser...");
    const actRes = await userService.updateUserStatus(adminAuth, repUser.id, true);
    if (actRes.user.isActive !== true) {
        throw new Error("Status response mismatch on activation");
    }
    const dbRepAfterAct = await prisma.user.findUnique({ where: { id: repUser.id } });
    if (dbRepAfterAct?.isActive !== true) {
        throw new Error("Database isActive mismatch after activation");
    }
    console.log("✓ User activation successfully verified in DB.");

    // Cleanup test records
    await prisma.user.deleteMany({
        where: {
            id: { in: [adminUser.id, repUser.id, customerUser.id, orgBUser.id] },
        },
    });
    await prisma.organization.deleteMany({
        where: {
            id: { in: [orgA.id, orgB.id] },
        },
    });

    console.log("=== All User Management Domain & Safety Checks PASSED Successfully! ===");
}

runVerification()
    .catch((err) => {
        console.error("Verification failed:", err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
