"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { TableRowSkeleton } from "@/components/ui/skeleton";
import { ChangeRoleModal } from "@/components/users/change-role-modal";
import { ChangeStatusModal } from "@/components/users/change-status-modal";
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import { useAuth } from "@/context/auth-context";
import { formatDate, formatDateTime, formatRelativeTime } from "@/lib/formatters";
import { USER_ROLE_META } from "@/lib/constants";
import {
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    Search,
    Shield,
    UserCheck,
    Users,
    X,
} from "lucide-react";
import type {
    SafeUserResponse,
    UserListResponse,
} from "@/server/modules/users/user.types";

export default function UsersAccessPage() {
    const router = useRouter();
    const { user: currentAdmin, isLoading: isAuthLoading } = useAuth();

    const [users, setUsers] = useState<SafeUserResponse[]>([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
    });
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Filter & Search states
    const [search, setSearch] = useState<string>("");
    const [debouncedSearch, setDebouncedSearch] = useState<string>("");
    const [roleFilter, setRoleFilter] = useState<string>("ALL");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [page, setPage] = useState<number>(1);
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

    // Modals
    const [roleModalUser, setRoleModalUser] = useState<SafeUserResponse | null>(null);
    const [statusModalUser, setStatusModalUser] = useState<SafeUserResponse | null>(null);

    // Client-side guard: Only ADMIN can access Users & Access
    useEffect(() => {
        if (!isAuthLoading && currentAdmin && currentAdmin.role !== "ADMIN") {
            router.replace("/dashboard");
        }
    }, [currentAdmin, isAuthLoading, router]);

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

    const handleRoleFilterChange = (value: string) => {
        setRoleFilter(value);
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
        setRoleFilter("ALL");
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

    const handleUserRoleUpdated = (updatedUser: SafeUserResponse) => {
        setUsers((prev) =>
            prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
        );
        setRefreshTrigger((prev) => prev + 1);
    };

    const handleUserStatusUpdated = (targetUserId: string, nextStatus: boolean) => {
        setUsers((prev) =>
            prev.map((u) =>
                u.id === targetUserId ? { ...u, isActive: nextStatus } : u
            )
        );
        setRefreshTrigger((prev) => prev + 1);
    };

    // Load users from backend API
    useEffect(() => {
        if (isAuthLoading || !currentAdmin || currentAdmin.role !== "ADMIN") {
            return;
        }

        let isMounted = true;

        async function load() {
            try {
                const params: Record<string, string | number | boolean> = {
                    page,
                    limit: 20,
                };

                if (roleFilter !== "ALL") {
                    params.role = roleFilter;
                }

                if (statusFilter === "active") {
                    params.isActive = true;
                } else if (statusFilter === "inactive") {
                    params.isActive = false;
                }

                if (debouncedSearch.trim()) {
                    params.search = debouncedSearch.trim();
                }

                const data = await apiClient.get<UserListResponse>(
                    API_ROUTES.USERS.LIST,
                    { params }
                );

                if (isMounted) {
                    setUsers(data.users || []);
                    setPagination(
                        data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 }
                    );
                    setErrorMessage(null);
                    setIsLoading(false);
                }
            } catch (err: unknown) {
                if (isMounted) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : "Failed to load organization members.";
                    setErrorMessage(message);
                    setIsLoading(false);
                }
            }
        }

        load();

        return () => {
            isMounted = false;
        };
    }, [page, debouncedSearch, roleFilter, statusFilter, refreshTrigger, isAuthLoading, currentAdmin]);

    if (isAuthLoading) {
        return null;
    }

    if (currentAdmin && currentAdmin.role !== "ADMIN") {
        return null;
    }

    const hasActiveFilters =
        search.trim() !== "" || roleFilter !== "ALL" || statusFilter !== "ALL";

    const startItem =
        pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
    const endItem = Math.min(pagination.page * pagination.limit, pagination.total);

    return (
        <div className="space-y-6">
            {/* Header info */}
            <div>
                <h2 className="text-[18px] font-semibold text-[#0F172A] tracking-tight">
                    Users & Access Control
                </h2>
                <p className="text-[13px] leading-[18px] text-[#475569] mt-0.5">
                    Manage organization members, assign operational roles, and regulate application access.
                </p>
            </div>

            {/* Filter & Search Toolbar */}
            <Card>
                <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        {/* Search & Select Filters */}
                        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
                            {/* Search input with Debounce */}
                            <div className="w-full sm:max-w-xs">
                                <Input
                                    type="text"
                                    placeholder="Search users by name or email..."
                                    value={search}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    leftIcon={<Search className="w-4 h-4 text-[#94A3B8]" />}
                                    rightIcon={
                                        search ? (
                                            <button
                                                type="button"
                                                onClick={() => handleSearchChange("")}
                                                className="text-[#94A3B8] hover:text-[#0F172A] cursor-pointer"
                                                aria-label="Clear search"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        ) : undefined
                                    }
                                />
                            </div>

                            {/* Role Filter */}
                            <div className="w-full sm:w-48">
                                <Select
                                    value={roleFilter}
                                    onChange={(e) => handleRoleFilterChange(e.target.value)}
                                    aria-label="Filter by user role"
                                >
                                    <option value="ALL">All Roles</option>
                                    <option value="ADMIN">Administrator</option>
                                    <option value="SALES_REP">Sales Representative</option>
                                    <option value="SALES_MANAGER">Sales Manager</option>
                                    <option value="FINANCE_OPERATIONS">Finance & Operations</option>
                                </Select>
                            </div>

                            {/* Status Filter */}
                            <div className="w-full sm:w-36">
                                <Select
                                    value={statusFilter}
                                    onChange={(e) => handleStatusFilterChange(e.target.value)}
                                    aria-label="Filter by active status"
                                >
                                    <option value="ALL">All Statuses</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </Select>
                            </div>

                            {/* Clear Filters Button */}
                            {hasActiveFilters && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearFilters}
                                    leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                                    className="shrink-0"
                                >
                                    Reset Filters
                                </Button>
                            )}
                        </div>

                        {/* Record count summary */}
                        <div className="text-[12px] leading-4 text-[#64748B] tabular-nums shrink-0 self-end sm:self-center">
                            {isLoading ? (
                                <span>Loading members...</span>
                            ) : (
                                <span>
                                    Showing <strong>{startItem}–{endItem}</strong> of{" "}
                                    <strong>{pagination.total}</strong> members
                                </span>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Error State if fetch failed */}
            {errorMessage && !isLoading && (
                <ErrorState
                    title="Failed to load users"
                    message={errorMessage}
                    onRetry={handleRetry}
                />
            )}

            {/* Dense Enterprise User Table */}
            {!errorMessage && (
                <div className="space-y-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[240px]">User</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="w-[180px]">Operational Role</TableHead>
                                <TableHead className="w-[120px]">Status</TableHead>
                                <TableHead className="w-[120px]">Joined</TableHead>
                                <TableHead className="w-[130px]">Last Updated</TableHead>
                                <TableHead align="right" className="w-[180px]">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <>
                                    <TableRowSkeleton columns={7} />
                                    <TableRowSkeleton columns={7} />
                                    <TableRowSkeleton columns={7} />
                                    <TableRowSkeleton columns={7} />
                                </>
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="p-0">
                                        {hasActiveFilters ? (
                                            <EmptyState
                                                icon={<Search className="w-6 h-6 text-[#94A3B8]" />}
                                                title="No matching members"
                                                description="No organization members match your current filter criteria."
                                                action={
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleClearFilters}
                                                        leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                                                    >
                                                        Reset Filters
                                                    </Button>
                                                }
                                                className="border-none rounded-none py-12"
                                            />
                                        ) : (
                                            <EmptyState
                                                icon={<Users className="w-6 h-6 text-[#94A3B8]" />}
                                                title="No organization users found"
                                                description="New users join the organization via signup with the organization slug."
                                                className="border-none rounded-none py-12"
                                            />
                                        )}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((u) => {
                                    const isSelf = u.id === currentAdmin?.id;
                                    const roleMeta = USER_ROLE_META[u.role] || {
                                        label: u.role.replace(/_/g, " "),
                                        badge: u.role,
                                    };

                                    return (
                                        <TableRow key={u.id}>
                                            {/* User with Initials Avatar */}
                                            <TableCell>
                                                <div className="flex items-center gap-2.5">
                                                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#F1F5F9] border border-[#CBD5E1] text-[#475569] font-medium text-[11px] shrink-0">
                                                        {u.name
                                                            ? u.name
                                                                  .split(" ")
                                                                  .map((n) => n[0])
                                                                  .join("")
                                                                  .slice(0, 2)
                                                                  .toUpperCase()
                                                            : "U"}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="font-semibold text-[#0F172A] block truncate">
                                                            {u.name}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* Email */}
                                            <TableCell>
                                                <span className="text-[#475569] text-[13px] truncate block">
                                                    {u.email}
                                                </span>
                                            </TableCell>

                                            {/* Role */}
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <Badge
                                                        variant={
                                                            u.role === "ADMIN"
                                                                ? "info"
                                                                : u.role === "SALES_MANAGER"
                                                                ? "warning"
                                                                : "neutral"
                                                        }
                                                        size="sm"
                                                        dot={false}
                                                    >
                                                        <Shield className="w-3 h-3 mr-1" />
                                                        {roleMeta.label}
                                                    </Badge>
                                                </div>
                                            </TableCell>

                                            {/* Status Badge */}
                                            <TableCell>
                                                <Badge
                                                    variant={u.isActive ? "success" : "neutral"}
                                                    size="sm"
                                                    dot
                                                >
                                                    {u.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>

                                            {/* Joined */}
                                            <TableCell>
                                                <span className="text-[12px] text-[#475569]">
                                                    {formatDate(u.createdAt, "short")}
                                                </span>
                                            </TableCell>

                                            {/* Last Updated */}
                                            <TableCell>
                                                <span
                                                    className="text-[12px] text-[#475569] cursor-help"
                                                    title={formatDateTime(u.updatedAt)}
                                                >
                                                    {formatRelativeTime(u.updatedAt)}
                                                </span>
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell align="right">
                                                {isSelf ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F1F5F9] text-[#64748B] border border-[#CBD5E1]">
                                                        <UserCheck className="w-3 h-3" />
                                                        You (Current)
                                                    </span>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setRoleModalUser(u)}
                                                            className="text-[12px] h-7 px-2"
                                                        >
                                                            Change Role
                                                        </Button>

                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setStatusModalUser(u)}
                                                            className={`text-[12px] h-7 px-2 ${
                                                                u.isActive
                                                                    ? "text-[#B91C1C] hover:text-[#991B1B] hover:bg-[#FEF2F2]"
                                                                    : "text-[#047857] hover:text-[#065F46] hover:bg-[#ECFDF5]"
                                                            }`}
                                                        >
                                                            {u.isActive ? "Deactivate" : "Activate"}
                                                        </Button>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination Controls */}
                    {pagination.totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                            <p className="text-[12px] text-[#64748B] tabular-nums">
                                Page <strong>{pagination.page}</strong> of{" "}
                                <strong>{pagination.totalPages}</strong>
                            </p>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.page <= 1 || isLoading}
                                    onClick={() => handlePageChange(Math.max(pagination.page - 1, 1))}
                                    leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.page >= pagination.totalPages || isLoading}
                                    onClick={() =>
                                        handlePageChange(
                                            Math.min(pagination.page + 1, pagination.totalPages)
                                        )
                                    }
                                    rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Change Role Modal */}
            <ChangeRoleModal
                isOpen={Boolean(roleModalUser)}
                targetUser={roleModalUser}
                onClose={() => setRoleModalUser(null)}
                onSuccess={handleUserRoleUpdated}
            />

            {/* Change Status Modal */}
            <ChangeStatusModal
                isOpen={Boolean(statusModalUser)}
                targetUser={statusModalUser}
                onClose={() => setStatusModalUser(null)}
                onSuccess={handleUserStatusUpdated}
            />
        </div>
    );
}
