import { BillingInterval, BillingType, Prisma } from "@prisma/client";
import { prisma } from "@/server/shared/db/prisma";
import {
    productService,
    mapProductToResponse,
    mapVariantToResponse,
} from "@/server/modules/products/product.service";
import type { AuthenticatedUser } from "@/server/modules/auth/auth.types";
import type { DemoProducts } from "./types";

export async function seedProducts(adminUser: AuthenticatedUser): Promise<DemoProducts> {
    console.log("--> Stage 3: Provisioning Product Catalog & Category Governance...");

    // 1. Ensure category rules exist in discount governance
    const categoryRules = [
        { category: "Hardware", maximumDiscountPercent: 25 },
        { category: "Services", maximumDiscountPercent: 30 },
        { category: "Subscriptions", maximumDiscountPercent: 20 },
    ];

    for (const cr of categoryRules) {
        await prisma.discountCategoryRule.upsert({
            where: {
                organizationId_category: {
                    organizationId: adminUser.organizationId,
                    category: cr.category,
                },
            },
            create: {
                organizationId: adminUser.organizationId,
                category: cr.category,
                maximumDiscountPercent: new Prisma.Decimal(cr.maximumDiscountPercent),
                isActive: true,
            },
            update: {
                maximumDiscountPercent: new Prisma.Decimal(cr.maximumDiscountPercent),
                isActive: true,
            },
        });
    }

    // 2. Helper to find or create product
    async function resolveProduct(
        name: string,
        category: string,
        basePrice: number,
        costPrice: number,
        billingType: BillingType,
        billingInterval?: BillingInterval | null,
        description?: string,
    ) {
        const existing = await prisma.product.findFirst({
            where: {
                organizationId: adminUser.organizationId,
                name,
            },
            include: {
                _count: { select: { variants: true } },
            },
        });

        if (existing) {
            return mapProductToResponse(existing);
        }

        return await productService.createProduct(adminUser, {
            name,
            category,
            basePrice,
            costPrice,
            billingType,
            billingInterval: billingInterval ?? undefined,
            description,
            isActive: true,
        });
    }

    // 3. Helper to find or create variant
    async function resolveVariant(
        productId: string,
        sku: string,
        name: string,
        price: number,
        cost: number,
        attributes?: Record<string, unknown>,
    ) {
        const existing = await prisma.productVariant.findFirst({
            where: {
                organizationId: adminUser.organizationId,
                productId,
                sku,
            },
        });

        if (existing) {
            return mapVariantToResponse(existing);
        }

        return await productService.createVariant(adminUser, productId, {
            sku,
            name,
            price,
            cost,
            attributes,
            isActive: true,
        });
    }

    // Product 1: Enterprise Edge Server Pro (Hardware with variants)
    const serverPro = await resolveProduct(
        "Enterprise Edge Server Pro",
        "Hardware",
        3200,
        1900,
        BillingType.ONE_TIME,
        null,
        "High-performance edge compute rack node for industrial deployments.",
    );

    const serverVariant16C = await resolveVariant(
        serverPro.id,
        "SRV-16C-64G",
        "16-Core 64GB Server",
        3200,
        1900,
        { cpu: "16-Core Xeon", ram: "64GB DDR5", storage: "2x 1TB NVMe" },
    );

    const serverVariant32C = await resolveVariant(
        serverPro.id,
        "SRV-32C-128G",
        "32-Core 128GB Server",
        5500,
        3200,
        { cpu: "32-Core Xeon", ram: "128GB DDR5", storage: "4x 2TB NVMe" },
    );

    // Product 2: Industrial Managed Switch 24P (Hardware WITHOUT variants, directly sellable)
    const switch24P = await resolveProduct(
        "Industrial Managed Switch 24P",
        "Hardware",
        1200,
        750,
        BillingType.ONE_TIME,
        null,
        "Ruggedized 24-Port Gigabit Ethernet Managed Switch for OT and Datacenter.",
    );

    // Product 3: Deployment & Integration Consulting (Services, ONE_TIME)
    const consultingService = await resolveProduct(
        "Deployment & Integration Consulting",
        "Services",
        2500,
        1000,
        BillingType.ONE_TIME,
        null,
        "Full turnkey deployment, architecture review, and staging integration.",
    );

    // Product 4: Cloud Fleet Management Suite (Subscriptions, MONTHLY recurring with variants)
    const cloudFleetSuite = await resolveProduct(
        "Cloud Fleet Management Suite",
        "Subscriptions",
        250,
        50,
        BillingType.RECURRING,
        BillingInterval.MONTHLY,
        "Continuous fleet telemetry, remote patching, and health diagnostics.",
    );

    const fleetVariantStd = await resolveVariant(
        cloudFleetSuite.id,
        "SUB-FLEET-STD",
        "Standard Fleet (Up to 50 Devices)",
        250,
        50,
        { capacity: "50 devices", slaTier: "99.5%" },
    );

    const fleetVariantEnt = await resolveVariant(
        cloudFleetSuite.id,
        "SUB-FLEET-ENT",
        "Enterprise Fleet (Unlimited Devices)",
        650,
        120,
        { capacity: "Unlimited devices", slaTier: "99.99%" },
    );

    // Product 5: 24/7 Mission Critical Support SLA (Subscriptions, YEARLY recurring without variants)
    const annualSla = await resolveProduct(
        "24/7 Mission Critical Support SLA",
        "Subscriptions",
        4800,
        1200,
        BillingType.RECURRING,
        BillingInterval.YEARLY,
        "Direct 15-minute response SLA, designated TAM, and quarterly operational reviews.",
    );

    console.log(`    ✓ Product 1: ${serverPro.name} (Variants: ${serverVariant16C.sku}, ${serverVariant32C.sku})`);
    console.log(`    ✓ Product 2: ${switch24P.name} [Directly Sellable Hardware]`);
    console.log(`    ✓ Product 3: ${consultingService.name} [One-Time Services]`);
    console.log(`    ✓ Product 4: ${cloudFleetSuite.name} (Recurring Monthly; Variants: ${fleetVariantStd.sku}, ${fleetVariantEnt.sku})`);
    console.log(`    ✓ Product 5: ${annualSla.name} [Recurring Yearly SLA]`);

    return {
        serverPro,
        serverVariant16C,
        serverVariant32C,
        switch24P,
        consultingService,
        cloudFleetSuite,
        fleetVariantStd,
        fleetVariantEnt,
        annualSla,
    };
}
