import type { AuthenticatedUser } from "@/server/modules/auth/auth.types";
import type { CustomerResponse } from "@/server/modules/customers/customer.types";
import type { ProductResponse, ProductVariantResponse } from "@/server/modules/products/product.types";
import type { WarehouseResponse } from "@/server/modules/warehouses/warehouse.types";

export interface DemoActors {
    admin: AuthenticatedUser;
    salesManager: AuthenticatedUser;
    salesRep: AuthenticatedUser;
    finance: AuthenticatedUser;
    bronzeCustomer: AuthenticatedUser;
    silverCustomer: AuthenticatedUser;
    goldCustomer: AuthenticatedUser;
}

export interface DemoCustomers {
    bronze: CustomerResponse;
    silver: CustomerResponse;
    gold: CustomerResponse;
}

export interface DemoProducts {
    serverPro: ProductResponse;
    serverVariant16C: ProductVariantResponse;
    serverVariant32C: ProductVariantResponse;
    switch24P: ProductResponse;
    consultingService: ProductResponse;
    cloudFleetSuite: ProductResponse;
    fleetVariantStd: ProductVariantResponse;
    fleetVariantEnt: ProductVariantResponse;
    annualSla: ProductResponse;
}

export interface DemoWarehouses {
    north: WarehouseResponse;
    south: WarehouseResponse;
    east: WarehouseResponse;
}

export interface DemoQuotationSummary {
    scenario: string;
    quotationId: string;
    quoteNumber: string;
    customerTier: string;
    customerEmail: string;
    status: string;
    revisionNumber: number;
    details: string;
}

export interface SeedContext {
    organizationId: string;
    organizationSlug: string;
    actors: DemoActors;
    customers: DemoCustomers;
    products: DemoProducts;
    warehouses: DemoWarehouses;
    quotations: DemoQuotationSummary[];
}
