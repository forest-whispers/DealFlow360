import bcrypt from "bcryptjs";
import { CustomerTier, Prisma, UserRole } from "@prisma/client";

import { prisma } from "@/server/shared/db/prisma";
import {
    ConflictError,
    ForbiddenError,
    NotFoundError,
} from "@/server/shared/errors/errors";
import type { AuthenticatedUser } from "@/server/modules/auth/auth.types";
import type {
    CreateCustomerInput,
    CustomerArchiveResponse,
    CustomerListResponse,
    CustomerResponse,
    CustomerStatusResponse,
    ListCustomersQuery,
    UpdateCustomerInput,
} from "./customer.types";

interface CustomerRecord {
    id: string;
    name: string;
    email: string;
    customerTier: CustomerTier | null;
    customerProfile: Prisma.JsonValue | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export function mapCustomerToResponse(record: CustomerRecord): CustomerResponse {
    let profile: Record<string, unknown> | null = null;
    if (
        record.customerProfile !== null &&
        typeof record.customerProfile === "object" &&
        !Array.isArray(record.customerProfile)
    ) {
        profile = record.customerProfile as Record<string, unknown>;
    }

    return {
        id: record.id,
        name: record.name,
        email: record.email,
        customerTier: record.customerTier,
        customerProfile: profile,
        isActive: record.isActive,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
    };
}

export class CustomerService {
    async listCustomers(
        user: AuthenticatedUser,
        query: ListCustomersQuery,
    ): Promise<CustomerListResponse> {
        const { page, limit, search, tier, isActive } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.UserWhereInput = {
            organizationId: user.organizationId,
            role: UserRole.CUSTOMER,
            ...(tier ? { customerTier: tier } : {}),
            ...(isActive !== undefined ? { isActive } : {}),
            ...(search
                ? {
                      OR: [
                          { name: { contains: search, mode: "insensitive" } },
                          { email: { contains: search, mode: "insensitive" } },
                      ],
                  }
                : {}),
        };

        const [total, customers] = await prisma.$transaction([
            prisma.user.count({ where }),
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    createdAt: "desc",
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    customerTier: true,
                    customerProfile: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
        ]);

        const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

        return {
            customers: customers.map(mapCustomerToResponse),
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }

    async getCustomerById(
        user: AuthenticatedUser,
        customerId: string,
    ): Promise<CustomerResponse> {
        const customer = await prisma.user.findFirst({
            where: {
                id: customerId,
                organizationId: user.organizationId,
                role: UserRole.CUSTOMER,
            },
            select: {
                id: true,
                name: true,
                email: true,
                customerTier: true,
                customerProfile: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!customer) {
            throw new NotFoundError("Customer not found.");
        }

        return mapCustomerToResponse(customer);
    }

    async createCustomer(
        user: AuthenticatedUser,
        input: CreateCustomerInput,
    ): Promise<CustomerResponse> {
        // Enforce duplicate check globally across User.email
        const existingUser = await prisma.user.findUnique({
            where: {
                email: input.email,
            },
            select: {
                id: true,
            },
        });

        if (existingUser) {
            throw new ConflictError(
                "A user with this email already exists.",
            );
        }

        const passwordHash = await bcrypt.hash(input.password, 12);

        let customerProfileData: Prisma.UserCreateInput["customerProfile"] = undefined;
        if (input.customerProfile === null) {
            customerProfileData = Prisma.JsonNull;
        } else if (input.customerProfile !== undefined) {
            customerProfileData = input.customerProfile as Prisma.InputJsonValue;
        }

        const createdUser = await prisma.user.create({
            data: {
                name: input.name,
                email: input.email,
                passwordHash,
                role: UserRole.CUSTOMER,
                organizationId: user.organizationId,
                customerTier: input.customerTier ?? CustomerTier.BRONZE,
                customerProfile: customerProfileData,
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                email: true,
                customerTier: true,
                customerProfile: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return mapCustomerToResponse(createdUser);
    }

    async updateCustomer(
        user: AuthenticatedUser,
        customerId: string,
        input: UpdateCustomerInput,
    ): Promise<CustomerResponse> {
        // Resource-level authorization: SALES_REP cannot update customerTier or isActive
        if (user.role === UserRole.SALES_REP) {
            if (
                input.customerTier !== undefined ||
                input.isActive !== undefined
            ) {
                throw new ForbiddenError(
                    "Sales representatives are not allowed to update customer tier or status.",
                );
            }
        }

        // Verify organization scoping and CUSTOMER role
        const existingCustomer = await prisma.user.findFirst({
            where: {
                id: customerId,
                organizationId: user.organizationId,
                role: UserRole.CUSTOMER,
            },
            select: {
                id: true,
                email: true,
            },
        });

        if (!existingCustomer) {
            throw new NotFoundError("Customer not found.");
        }

        // Global email uniqueness check excluding current user
        if (input.email && input.email !== existingCustomer.email) {
            const emailConflict = await prisma.user.findUnique({
                where: { email: input.email },
                select: { id: true },
            });

            if (emailConflict && emailConflict.id !== customerId) {
                throw new ConflictError(
                    "A user with this email already exists.",
                );
            }
        }

        const updateData: Prisma.UserUpdateInput = {};

        if (input.name !== undefined) {
            updateData.name = input.name;
        }
        if (input.email !== undefined) {
            updateData.email = input.email;
        }
        if (input.customerTier !== undefined) {
            updateData.customerTier = input.customerTier;
        }
        if (input.customerProfile === null) {
            updateData.customerProfile = Prisma.JsonNull;
        } else if (input.customerProfile !== undefined) {
            updateData.customerProfile = input.customerProfile as Prisma.InputJsonValue;
        }
        if (input.isActive !== undefined) {
            updateData.isActive = input.isActive;
        }

        const updatedUser = await prisma.user.update({
            where: {
                id: customerId,
            },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                customerTier: true,
                customerProfile: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return mapCustomerToResponse(updatedUser);
    }

    async archiveCustomer(
        user: AuthenticatedUser,
        customerId: string,
    ): Promise<CustomerArchiveResponse> {
        const existingCustomer = await prisma.user.findFirst({
            where: {
                id: customerId,
                organizationId: user.organizationId,
                role: UserRole.CUSTOMER,
            },
            select: {
                id: true,
                isActive: true,
            },
        });

        if (!existingCustomer) {
            throw new NotFoundError("Customer not found.");
        }

        // Soft delete: idempotent if already inactive
        if (existingCustomer.isActive) {
            await prisma.user.update({
                where: { id: customerId },
                data: { isActive: false },
            });
        }

        return {
            message: "Customer archived successfully.",
        };
    }

    async updateCustomerStatus(
        user: AuthenticatedUser,
        customerId: string,
        isActive: boolean,
    ): Promise<CustomerStatusResponse> {
        const existingCustomer = await prisma.user.findFirst({
            where: {
                id: customerId,
                organizationId: user.organizationId,
                role: UserRole.CUSTOMER,
            },
            select: {
                id: true,
                isActive: true,
            },
        });

        if (!existingCustomer) {
            throw new NotFoundError("Customer not found.");
        }

        const updated = await prisma.user.update({
            where: { id: customerId },
            data: { isActive },
            select: {
                id: true,
                isActive: true,
            },
        });

        return {
            customer: {
                id: updated.id,
                isActive: updated.isActive,
            },
        };
    }
}

export const customerService = new CustomerService();
