"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { TableRowSkeleton } from "@/components/ui/skeleton";
import { CreateCustomerModal } from "@/components/customers/create-customer-modal";
import { ChangeCustomerStatusModal } from "@/components/customers/change-customer-status-modal";
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import { useAuth } from "@/context/auth-context";
import { formatDate } from "@/lib/formatters";
import {
    CUSTOMER_MANAGE_ROLES,
    CUSTOMER_STATUS_ROLES,
} from "@/lib/constants";
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    RotateCcw,
    Search,
    ShieldAlert,
    UserCheck,
    Users,
    X,
} from "lucide-react";
import type {
    CustomerListResponse,
    CustomerResponse,
} from "@/server/modules/customers/customer.types";

export default function CustomersPage() {
    const router = useRouter();
    const { user: currentUser } = useAuth();

    const [customers, setCustomers] = useState<CustomerResponse[]>([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
    });
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Filters & Search
    const [search, setSearch] = useState<string>("");
    const [debouncedSearch, setDebouncedSearch] = useState<string>("");
    const [tierFilter, setTierFilter] = useState<string>("ALL");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [page, setPage] = useState<number>(1);
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
    const [statusModalCustomer, setStatusModalCustomer] = useState<CustomerResponse | null>(null);

    const canCreateCustomer =
        currentUser && CUSTOMER_MANAGE_ROLES.includes(currentUser.role);
    const canChangeStatus =
        currentUser && CUSTOMER_STATUS_ROLES.includes(currentUser.role);

    // Debounce search input by 300ms
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);

        return () => clearTimeout(timer);
    }, [search]);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        setIsLoading(true);
        setPage(1);
    };

    const handleTierFilterChange = (value: string) => {
        setTierFilter(value);
        setIsLoading(true);
        setPage(1);
    };

    const handleStatusFilterChange = (value: string) => {
        setStatusFilter(value);
        setIsLoading(true);
        setPage(1);
    };

    const handleClearFilters = () => {
        setSearch("");
        setDebouncedSearch("");
        setTierFilter("ALL");
        setStatusFilter("ALL");
        setIsLoading(true);
        setPage(1);
    };

    const handlePageChange = (newPage: number) => {
        setIsLoading(true);
        setPage(newPage);
    };

    const handleRetry = () => {
        setIsLoading(true);
        setErrorMessage(null);
        setRefreshTrigger((prev) => prev + 1);
    };

    // Asynchronous load effect
    useEffect(() => {
        let isMounted = true;

        async function load() {
            try {
                const params: Record<string, string | number | boolean> = {
                    page,
                    limit: 20,
                };

                if (tierFilter !== "ALL") {
                    params.tier = tierFilter;
                }

                if (statusFilter === "ACTIVE") {
                    params.isActive = true;
                } else if (statusFilter === "INACTIVE") {
                    params.isActive = false;
                }

                if (debouncedSearch.trim()) {
                    params.search = debouncedSearch.trim();
                }

                const response = await apiClient.get<CustomerListResponse>(
                    API_ROUTES.CUSTOMERS.LIST,
                    { params }
                );

                if (isMounted) {
                    setCustomers(response.customers || []);
                    setPagination(
                        response.pagination || {
                            page: 1,
                            limit: 20,
                            total: 0,
                            totalPages: 1,
                        }
                    );
                    setErrorMessage(null);
                    setIsLoading(false);
                }
            } catch (err: unknown) {
                if (isMounted) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : "Failed to load customers. Please check network connection.";
                    setErrorMessage(message);
                    setIsLoading(false);
                }
            }
        }

        load();

        return () => {
            isMounted = false;
        };
    }, [page, debouncedSearch, tierFilter, statusFilter, refreshTrigger]);

    const handleCustomerStatusChanged = (customerId: string, nextStatus: boolean) => {
        setCustomers((prev) =>
            prev.map((c) => (c.id === customerId ? { ...c, isActive: nextStatus } : c))
        );
    };

    const handleCustomerCreated = (newCustomer: CustomerResponse) => {
        setCustomers((prev) => [newCustomer, ...prev]);
        setPagination((prev) => ({ ...prev, total: prev.total + 1 }));
    };

    const hasActiveFilters =
        Boolean(search.trim()) || tierFilter !== "ALL" || statusFilter !== "ALL";

    return (
        <div className="space-y-6">
            <PageHeader
                title="Customers"
                description="Manage customer accounts, commercial relationship tiers, and portal access."
                actions={
                    canCreateCustomer ? (
                        <Button
                            variant="primary"
                            size="default"
                            leftIcon={<Plus className="w-4 h-4" />}
                            onClick={() => setIsCreateModalOpen(true)}
                        >
                            Add Customer
                        </Button>
                    ) : undefined
                }
            />

            {/* Filter Bar */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1 max-w-md">
                            <Input
                                placeholder="Search by customer name or email..."
                                value={search}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                leftIcon={<Search className="w-4 h-4" />}
                                rightIcon={
                                    search ? (
                                        <button
                                            type="button"
                                            onClick={() => handleSearchChange("")}
                                            className="hover:text-[#0F172A]"
                                            aria-label="Clear search"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    ) : undefined
                                }
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="w-36">
                                <Select
                                    value={tierFilter}
                                    onChange={(e) => handleTierFilterChange(e.target.value)}
                                >
                                    <option value="ALL">All Tiers</option>
                                    <option value="BRONZE">Bronze</option>
                                    <option value="SILVER">Silver</option>
                                    <option value="GOLD">Gold</option>
                                </Select>
                            </div>

                            <div className="w-36">
                                <Select
                                    value={statusFilter}
                                    onChange={(e) => handleStatusFilterChange(e.target.value)}
                                >
                                    <option value="ALL">All Status</option>
                                    <option value="ACTIVE">Active</option>
                                    <option value="INACTIVE">Inactive</option>
                                </Select>
                            </div>

                            {hasActiveFilters && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearFilters}
                                    className="text-[#64748B] hover:text-[#0F172A]"
                                >
                                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                    Reset
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Customer Directory Table */}
            <Card>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[300px]">Customer</TableHead>
                                <TableHead className="w-[160px]">Commercial Tier</TableHead>
                                <TableHead className="w-[140px]">Status</TableHead>
                                <TableHead className="w-[160px]">Enrolled On</TableHead>
                                <TableHead className="w-[140px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <TableRowSkeleton key={i} columns={5} />
                                ))
                            ) : errorMessage ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-12 text-center">
                                        <ErrorState
                                            title="Failed to Load Customers"
                                            message={errorMessage}
                                            onRetry={handleRetry}
                                        />
                                    </TableCell>
                                </TableRow>
                            ) : customers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-12 text-center">
                                        <EmptyState
                                            icon={<Users className="w-10 h-10 text-[#94A3B8]" />}
                                            title={
                                                hasActiveFilters
                                                    ? "No matching customers found"
                                                    : "No customers enrolled yet"
                                            }
                                            description={
                                                hasActiveFilters
                                                    ? "Adjust or clear your search and filters to find customer accounts."
                                                    : "Start by registering your first customer account for quotations and orders."
                                            }
                                            action={
                                                hasActiveFilters ? (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleClearFilters}
                                                    >
                                                        Clear Filters
                                                    </Button>
                                                ) : canCreateCustomer ? (
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        leftIcon={<Plus className="w-4 h-4" />}
                                                        onClick={() => setIsCreateModalOpen(true)}
                                                    >
                                                        Add First Customer
                                                    </Button>
                                                ) : undefined
                                            }
                                        />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                customers.map((cust) => {
                                    const profile =
                                        (cust.customerProfile as Record<string, unknown>) || {};
                                    const company =
                                        typeof profile.companyName === "string"
                                            ? profile.companyName
                                            : null;

                                    return (
                                        <TableRow
                                            key={cust.id}
                                            className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                                            onClick={() => router.push(`/customers/${cust.id}`)}
                                        >
                                            {/* Customer Name & Email */}
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] font-semibold text-[12px] shrink-0">
                                                        {cust.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <Link
                                                            href={`/customers/${cust.id}`}
                                                            className="text-[13px] font-medium text-[#0F172A] hover:text-[#1E40AF] truncate block"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {cust.name}
                                                        </Link>
                                                        <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
                                                            <span>{cust.email}</span>
                                                            {company && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span className="text-[#475569] truncate">
                                                                        {company}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* Tier */}
                                            <TableCell>
                                                <StatusBadge
                                                    type="tier"
                                                    status={cust.customerTier || "BRONZE"}
                                                />
                                            </TableCell>

                                            {/* Status */}
                                            <TableCell>
                                                <Badge
                                                    variant={cust.isActive ? "success" : "neutral"}
                                                    dot
                                                >
                                                    {cust.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>

                                            {/* Enrolled On */}
                                            <TableCell className="text-[12px] text-[#64748B]">
                                                {formatDate(cust.createdAt)}
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="text-right">
                                                <div
                                                    className="flex items-center justify-end gap-1"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Link href={`/customers/${cust.id}`}>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-[12px] text-[#1E40AF] hover:text-[#1D4ED8]"
                                                        >
                                                            View
                                                        </Button>
                                                    </Link>

                                                    {canChangeStatus && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className={`text-[12px] ${
                                                                cust.isActive
                                                                    ? "text-[#64748B] hover:text-[#B91C1C]"
                                                                    : "text-[#047857] hover:text-[#065F46]"
                                                            }`}
                                                            title={
                                                                cust.isActive
                                                                    ? "Deactivate Customer"
                                                                    : "Activate Customer"
                                                            }
                                                            onClick={() => setStatusModalCustomer(cust)}
                                                        >
                                                            {cust.isActive ? (
                                                                <ShieldAlert className="w-3.5 h-3.5" />
                                                            ) : (
                                                                <UserCheck className="w-3.5 h-3.5" />
                                                            )}
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {!isLoading && !errorMessage && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0]">
                        <div className="text-[12px] text-[#64748B]">
                            Showing{" "}
                            <span className="font-semibold text-[#0F172A]">
                                {(pagination.page - 1) * pagination.limit + 1}
                            </span>{" "}
                            to{" "}
                            <span className="font-semibold text-[#0F172A]">
                                {Math.min(pagination.page * pagination.limit, pagination.total)}
                            </span>{" "}
                            of{" "}
                            <span className="font-semibold text-[#0F172A]">
                                {pagination.total}
                            </span>{" "}
                            customers
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={pagination.page <= 1}
                                onClick={() => handlePageChange(pagination.page - 1)}
                                className="h-8 w-8 p-0"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-[12px] text-[#475569] font-medium px-1">
                                Page {pagination.page} of {pagination.totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={pagination.page >= pagination.totalPages}
                                onClick={() => handlePageChange(pagination.page + 1)}
                                className="h-8 w-8 p-0"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Modals */}
            <CreateCustomerModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={handleCustomerCreated}
            />

            <ChangeCustomerStatusModal
                isOpen={Boolean(statusModalCustomer)}
                onClose={() => setStatusModalCustomer(null)}
                customer={statusModalCustomer}
                onSuccess={handleCustomerStatusChanged}
            />
        </div>
    );
}
