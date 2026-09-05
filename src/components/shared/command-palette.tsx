"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Search,
    LayoutDashboard,
    FileText,
    Users,
    Package,
    ShieldAlert,
    Truck,
    Receipt,
    Sliders,
    Warehouse,
    Settings,
    Plus,
    X,
    ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/cn";

export interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
}

interface CommandItem {
    id: string;
    title: string;
    category: "Navigation" | "Actions";
    href?: string;
    icon: React.ReactNode;
    shortcut?: string;
}

const COMMAND_ITEMS: CommandItem[] = [
    { id: "dashboard", title: "Go to Dashboard", category: "Navigation", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "quotations", title: "View Quotations", category: "Navigation", href: "/quotations", icon: <FileText className="w-4 h-4" /> },
    { id: "customers", title: "View Customers", category: "Navigation", href: "/customers", icon: <Users className="w-4 h-4" /> },
    { id: "products", title: "View Products & Variants", category: "Navigation", href: "/products", icon: <Package className="w-4 h-4" /> },
    { id: "approvals", title: "Pending Approvals Queue", category: "Navigation", href: "/approvals", icon: <ShieldAlert className="w-4 h-4" /> },
    { id: "fulfillment", title: "Fulfillment & Allocations", category: "Navigation", href: "/fulfillment", icon: <Truck className="w-4 h-4" /> },
    { id: "billing", title: "Billing & Invoices", category: "Navigation", href: "/billing", icon: <Receipt className="w-4 h-4" /> },
    { id: "governance", title: "Discount Governance Rules", category: "Navigation", href: "/governance", icon: <Sliders className="w-4 h-4" /> },
    { id: "warehouses", title: "Warehouses & Inventory", category: "Navigation", href: "/warehouses", icon: <Warehouse className="w-4 h-4" /> },
    { id: "settings", title: "Organization Settings", category: "Navigation", href: "/settings", icon: <Settings className="w-4 h-4" /> },
    { id: "new-quote", title: "Create New Quotation", category: "Actions", href: "/quotations/new", icon: <Plus className="w-4 h-4" />, shortcut: "N" },
    { id: "new-customer", title: "Add New Customer", category: "Actions", href: "/customers/new", icon: <Plus className="w-4 h-4" /> },
    { id: "new-product", title: "Create Product Catalog Item", category: "Actions", href: "/products/new", icon: <Plus className="w-4 h-4" /> },
];

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const router = useRouter();

    const filteredItems = COMMAND_ITEMS.filter((item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
    );

    const executeItem = useCallback((item: CommandItem) => {
        if (item.href) {
            router.push(item.href);
        }
        onClose();
        setQuery("");
    }, [router, onClose]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
            } else if (e.key === "Enter") {
                e.preventDefault();
                const selected = filteredItems[selectedIndex];
                if (selected) {
                    executeItem(selected);
                }
            } else if (e.key === "Escape") {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, filteredItems, selectedIndex, executeItem, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-xs transition-opacity duration-200"
                onClick={onClose}
            />

            {/* Command Box */}
            <div className="relative w-full max-w-xl rounded-lg border border-[#CBD5E1] bg-white shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95">
                {/* Search Bar */}
                <div className="flex items-center px-4 border-b border-[#E2E8F0] h-12">
                    <Search className="w-4 h-4 text-[#94A3B8] shrink-0 mr-3" />
                    <input
                        type="text"
                        autoFocus
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                        placeholder="Search quotations, navigation, or operational actions..."
                        className="w-full bg-transparent text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none"
                    />
                    {query && (
                        <button
                            onClick={() => setQuery("")}
                            className="p-1 text-[#94A3B8] hover:text-[#0F172A]"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <kbd className="hidden sm:inline-flex ml-2 px-1.5 py-0.5 text-[10px] font-semibold text-[#64748B] bg-[#F1F5F9] border border-[#E2E8F0] rounded">
                        ESC
                    </kbd>
                </div>

                {/* Results List */}
                <div className="max-h-80 overflow-y-auto p-2">
                    {filteredItems.length === 0 ? (
                        <div className="py-8 text-center text-[13px] text-[#94A3B8]">
                            No matching commands found
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredItems.map((item, index) => {
                                const isSelected = index === selectedIndex;
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => executeItem(item)}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                        className={cn(
                                            "flex items-center justify-between px-3 py-2 rounded-md text-[13px] cursor-pointer transition-colors select-none",
                                            isSelected
                                                ? "bg-[#EFF6FF] text-[#1E40AF]"
                                                : "text-[#0F172A] hover:bg-[#F8FAFC]"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={cn(isSelected ? "text-[#1E40AF]" : "text-[#94A3B8]")}>
                                                {item.icon}
                                            </span>
                                            <span className="font-medium">{item.title}</span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] text-[#94A3B8] uppercase tracking-wider font-semibold">
                                                {item.category}
                                            </span>
                                            {isSelected && (
                                                <ArrowRight className="w-3.5 h-3.5 text-[#1E40AF]" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Tips */}
                <div className="px-4 py-2 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#64748B]">
                    <span>DealFlow360 Global Command</span>
                    <div className="flex items-center gap-3">
                        <span>Navigate <kbd className="font-semibold text-[#475569]">↑↓</kbd></span>
                        <span>Select <kbd className="font-semibold text-[#475569]">↵</kbd></span>
                    </div>
                </div>
            </div>
        </div>
    );
}
