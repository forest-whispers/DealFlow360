"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui/table";
import { TableRowSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { RoleGate } from "@/components/shared/role-gate";
import { CreateWarehouseModal } from "@/components/warehouses/create-warehouse-modal";
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import { useAuth } from "@/context/auth-context";
import { WAREHOUSE_READ_ROLES, WAREHOUSE_MANAGE_ROLES } from "@/lib/constants";
import {
    Boxes,
    ChevronRight,
    Package,
    Plus,
    RotateCw,
    Search,
    Warehouse as WarehouseIcon,
} from "lucide-react";
import type {
    WarehouseResponse,
    WarehouseListResponse,
    InventoryItemResponse,
    InventoryListResponse,
} from "@/server/modules/warehouses/warehouse.types";

export default function WarehousesPage() {
    const { user: currentUser } = useAuth();
    const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
    const [isLoadingWarehouses, setIsLoadingWarehouses] = useState<boolean>(true);
    const [warehouseError, setWarehouseError] = useState<string | null>(null);

    // Create Modal
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

    // Selected Warehouse for Inventory View
    const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseResponse | null>(null);
    const [inventoryItems, setInventoryItems] = useState<InventoryItemResponse[]>([]);
    const [isLoadingInventory, setIsLoadingInventory] = useState<boolean>(false);
    const [inventoryError, setInventoryError] = useState<string | null>(null);
    const [inventorySearch, setInventorySearch] = useState<string>("");
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

    const canManageWarehouses = Boolean(
        currentUser &&
            (WAREHOUSE_MANAGE_ROLES as readonly string[]).includes(currentUser.role)
    );

    // Fetch Warehouses
    useEffect(() => {
        let isMounted = true;
        const timer = setTimeout(async () => {
            setIsLoadingWarehouses(true);
            setWarehouseError(null);

            try {
                const res = await apiClient.get<WarehouseListResponse>(
                    API_ROUTES.WAREHOUSES.LIST
                );
                if (isMounted) {
                    const list = res.warehouses || [];
                    setWarehouses(list);
                    if (list.length > 0) {
                        setSelectedWarehouse((prev) => prev || list[0]);
                    }
                }
            } catch (err: unknown) {
                if (isMounted) {
                    const msg =
                        err instanceof Error
                            ? err.message
                            : "Failed to load warehouse facilities.";
                    setWarehouseError(msg);
                }
            } finally {
                if (isMounted) {
                    setIsLoadingWarehouses(false);
                }
            }
        }, 0);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [refreshTrigger]);

    // Fetch Inventory for Selected Warehouse
    useEffect(() => {
        let isMounted = true;
        const timer = setTimeout(async () => {
            if (!selectedWarehouse) {
                setInventoryItems([]);
                return;
            }

            setIsLoadingInventory(true);
            setInventoryError(null);

            const params: Record<string, string | number> = {
                limit: 100,
            };
            if (inventorySearch.trim()) {
                params.search = inventorySearch.trim();
            }

            try {
                const res = await apiClient.get<InventoryListResponse>(
                    API_ROUTES.WAREHOUSES.INVENTORY.LIST(selectedWarehouse.id),
                    { params }
                );
                if (isMounted) {
                    setInventoryItems(res.inventory || []);
                }
            } catch (err: unknown) {
                if (isMounted) {
                    const msg =
                        err instanceof Error
                            ? err.message
                            : "Failed to load warehouse inventory.";
                    setInventoryError(msg);
                }
            } finally {
                if (isMounted) {
                    setIsLoadingInventory(false);
                }
            }
        }, 0);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [selectedWarehouse, inventorySearch, refreshTrigger]);

    return (
        <RoleGate
            allowedRoles={[...WAREHOUSE_READ_ROLES]}
            fallback={
                <div className="py-12 text-center text-[#64748B] text-[14px]">
                    Access Restricted: You do not have permission to view warehouse facilities.
                </div>
            }
        >
            <div className="space-y-6">
                {/* Page Header */}
                <PageHeader
                    title="Warehouses & Inventory"
                    description="Fulfillment center facilities, allocation priority configuration, and stock inventory levels."
                    breadcrumbs={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Configuration", href: "/warehouses" },
                        { label: "Warehouses" },
                    ]}
                    actions={
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<RotateCw className="w-3.5 h-3.5" />}
                                onClick={() => setRefreshTrigger((prev) => prev + 1)}
                                isLoading={isLoadingWarehouses}
                            >
                                Refresh
                            </Button>
                            {canManageWarehouses && (
                                <Button
                                    variant="primary"
                                    size="sm"
                                    leftIcon={<Plus className="w-4 h-4" />}
                                    onClick={() => setIsCreateModalOpen(true)}
                                >
                                    Add Warehouse
                                </Button>
                            )}
                        </div>
                    }
                />

                {/* Two-Column Layout: Facilities List (Left) vs Warehouse Inventory (Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column: Warehouse Facilities (4 cols) */}
                    <div className="lg:col-span-5 space-y-4">
                        <Card className="border-[#E2E8F0] shadow-xs">
                            <CardHeader className="pb-3 border-b border-[#F1F5F9] flex flex-row items-center justify-between">
                                <CardTitle className="text-[14px] font-semibold text-[#0F172A] flex items-center gap-2">
                                    <WarehouseIcon className="w-4 h-4 text-[#1E40AF]" />
                                    Fulfillment Centers
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    <Badge variant="neutral" size="sm">
                                        {warehouses.length} {warehouses.length === 1 ? "Facility" : "Facilities"}
                                    </Badge>
                                </div>
                            </CardHeader>

                            <CardContent className="p-3">
                                {isLoadingWarehouses ? (
                                    <div className="space-y-2">
                                        <div className="h-16 bg-[#F1F5F9] rounded-lg animate-pulse" />
                                        <div className="h-16 bg-[#F1F5F9] rounded-lg animate-pulse" />
                                        <div className="h-16 bg-[#F1F5F9] rounded-lg animate-pulse" />
                                    </div>
                                ) : warehouseError ? (
                                    <div className="py-4">
                                        <ErrorState
                                            title="Error Loading Warehouses"
                                            message={warehouseError}
                                            onRetry={() => setRefreshTrigger((p) => p + 1)}
                                        />
                                    </div>
                                ) : warehouses.length === 0 ? (
                                    <div className="py-6 text-center text-[13px] text-[#64748B] space-y-3">
                                        <p>No warehouses configured.</p>
                                        {canManageWarehouses && (
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                leftIcon={<Plus className="w-4 h-4" />}
                                                onClick={() => setIsCreateModalOpen(true)}
                                            >
                                                Add First Warehouse
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {warehouses.map((wh) => {
                                            const isSelected = selectedWarehouse?.id === wh.id;

                                            return (
                                                <div
                                                    key={wh.id}
                                                    onClick={() => setSelectedWarehouse(wh)}
                                                    className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                                                        isSelected
                                                            ? "bg-[#EFF6FF] border-[#3B82F6] shadow-xs"
                                                            : "bg-white border-[#E2E8F0] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]"
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono text-[11px] font-bold text-[#1E40AF] bg-[#DBEAFE] px-1.5 py-0.5 rounded">
                                                                    {wh.code}
                                                                </span>
                                                                <span className="font-semibold text-[13px] text-[#0F172A]">
                                                                    {wh.name}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3 text-[11px] text-[#64748B]">
                                                                <span>Allocation Priority: <strong className="text-[#0F172A]">#{wh.priority}</strong></span>
                                                                {wh.inventoryCount !== undefined && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span>{wh.inventoryCount} items</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <Badge
                                                                variant={wh.status === "ACTIVE" ? "success" : "neutral"}
                                                                size="sm"
                                                            >
                                                                {wh.status}
                                                            </Badge>
                                                            <ChevronRight
                                                                className={`w-4 h-4 transition-transform ${
                                                                    isSelected
                                                                        ? "text-[#1E40AF] translate-x-0.5"
                                                                        : "text-[#94A3B8]"
                                                                }`}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Informational Guidance */}
                        <div className="p-3.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[12px] text-[#64748B] space-y-1">
                            <strong className="text-[#0F172A] block font-semibold">
                                Allocation Engine Order:
                            </strong>
                            <p>
                                The backend allocation algorithm fulfills quotation line quantities prioritizing facilities with lower priority numbers (Priority 1 first, then 2, 3...) based on available inventory.
                            </p>
                        </div>
                    </div>

                    {/* Right Column: Inventory Stock for Selected Facility (7 cols) */}
                    <div className="lg:col-span-7 space-y-4">
                        <Card className="border-[#E2E8F0] shadow-xs">
                            <CardHeader className="pb-3 border-b border-[#F1F5F9] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div>
                                    <CardTitle className="text-[14px] font-semibold text-[#0F172A] flex items-center gap-2">
                                        <Package className="w-4 h-4 text-[#1E40AF]" />
                                        {selectedWarehouse
                                            ? `Inventory: ${selectedWarehouse.name} (${selectedWarehouse.code})`
                                            : "Select a Warehouse"}
                                    </CardTitle>
                                    <p className="text-[12px] text-[#64748B] mt-0.5">
                                        Read-only inventory levels available for fulfillment allocation
                                    </p>
                                </div>

                                {/* Inventory Search */}
                                {selectedWarehouse && (
                                    <div className="w-full sm:w-56">
                                        <Input
                                            placeholder="Search product / SKU..."
                                            value={inventorySearch}
                                            onChange={(e) => setInventorySearch(e.target.value)}
                                            className="h-8 text-[12px]"
                                            leftIcon={<Search className="w-3.5 h-3.5 text-[#94A3B8]" />}
                                        />
                                    </div>
                                )}
                            </CardHeader>

                            <CardContent className="p-0">
                                {!selectedWarehouse ? (
                                    <div className="p-10 text-center text-[13px] text-[#64748B]">
                                        Select a warehouse on the left to view inventory records.
                                    </div>
                                ) : isLoadingInventory ? (
                                    <div className="p-4">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Product</TableHead>
                                                    <TableHead>Category</TableHead>
                                                    <TableHead>SKU</TableHead>
                                                    <TableHead className="text-right">Available Qty</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <TableRowSkeleton key={i} columns={4} />
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : inventoryError ? (
                                    <div className="p-8">
                                        <ErrorState
                                            title="Failed to Load Inventory"
                                            message={inventoryError}
                                            onRetry={() => setRefreshTrigger((p) => p + 1)}
                                        />
                                    </div>
                                ) : inventoryItems.length === 0 ? (
                                    <div className="p-8">
                                        <EmptyState
                                            icon={<Boxes className="w-8 h-8 text-[#94A3B8]" />}
                                            title="No Inventory Records"
                                            description={
                                                inventorySearch
                                                    ? "No products match your search query in this warehouse."
                                                    : "This facility currently has no inventory items recorded."
                                            }
                                        />
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-[#F8FAFC]">
                                                <TableHead className="font-semibold text-[#0F172A]">
                                                    Product
                                                </TableHead>
                                                <TableHead className="w-32 font-semibold text-[#0F172A]">
                                                    Category
                                                </TableHead>
                                                <TableHead className="w-40 font-semibold text-[#0F172A]">
                                                    Variant / SKU
                                                </TableHead>
                                                <TableHead className="w-32 text-right font-semibold text-[#0F172A]">
                                                    Available Qty
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {inventoryItems.map((item) => (
                                                <TableRow
                                                    key={item.id}
                                                    className="hover:bg-[#F8FAFC]/70 transition-colors"
                                                >
                                                    <TableCell className="font-medium text-[13px] text-[#0F172A]">
                                                        {item.product.name}
                                                    </TableCell>
                                                    <TableCell className="text-[12px] text-[#64748B]">
                                                        <Badge variant="neutral" size="sm">
                                                            {item.product.category}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-[12px]">
                                                        <div className="space-y-0.5">
                                                            {item.variant?.name && (
                                                                <div className="font-medium text-[#0F172A]">
                                                                    {item.variant.name}
                                                                </div>
                                                            )}
                                                            <div className="font-mono text-[11px] text-[#64748B]">
                                                                {item.variant?.sku || "—"}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <span
                                                            className={`font-semibold text-[13px] ${
                                                                item.availableQty > 0
                                                                    ? "text-[#16A34A]"
                                                                    : "text-[#DC2626]"
                                                            }`}
                                                        >
                                                            {item.availableQty.toLocaleString()} units
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Create Warehouse Modal */}
                <CreateWarehouseModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={(newWh) => {
                        setRefreshTrigger((prev) => prev + 1);
                        setSelectedWarehouse(newWh);
                    }}
                />
            </div>
        </RoleGate>
    );
}
