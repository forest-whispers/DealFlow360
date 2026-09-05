"use client";

import React, { useState } from "react";
import { Topbar } from "./topbar";
import { Sidebar, MobileSidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
            {/* 56px Topbar */}
            <Topbar onToggleMobileSidebar={() => setIsMobileOpen(true)} />

            {/* Main Area: Sidebar + Page Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Desktop Collapsible Sidebar */}
                <Sidebar
                    isCollapsed={isCollapsed}
                    onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
                />

                {/* Mobile Drawer Sidebar */}
                <MobileSidebar
                    isOpen={isMobileOpen}
                    onClose={() => setIsMobileOpen(false)}
                />

                {/* Primary Page Canvas (24px desktop padding rhythm) */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F8FAFC]">
                    <div className="max-w-7xl mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
