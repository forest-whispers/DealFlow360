"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
    id: string;
    type: ToastType;
    title: string;
    description?: string;
    duration?: number;
}

interface ToastContextType {
    toasts: ToastItem[];
    toast: {
        success: (title: string, description?: string) => void;
        error: (title: string, description?: string) => void;
        warning: (title: string, description?: string) => void;
        info: (title: string, description?: string) => void;
    };
    dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback(
        (type: ToastType, title: string, description?: string, duration: number = 4000) => {
            const id = Math.random().toString(36).substring(2, 9);
            const newToast: ToastItem = { id, type, title, description, duration };

            setToasts((prev) => [...prev, newToast]);

            if (duration > 0) {
                setTimeout(() => {
                    dismiss(id);
                }, duration);
            }
        },
        [dismiss]
    );

    const toast = {
        success: (title: string, description?: string) => addToast("success", title, description),
        error: (title: string, description?: string) => addToast("error", title, description, 5000),
        warning: (title: string, description?: string) => addToast("warning", title, description, 5000),
        info: (title: string, description?: string) => addToast("info", title, description),
    };

    return (
        <ToastContext.Provider value={{ toasts, toast, dismiss }}>
            {children}
            {/* Toast Container */}
            <div
                aria-live="assertive"
                className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none"
            >
                {toasts.map((item) => (
                    <div
                        key={item.id}
                        className={cn(
                            "pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-sm transition-all duration-200 animate-in fade-in slide-in-from-bottom-2",
                            item.type === "success" && "bg-[#ECFDF5] border-[#A7F3D0] text-[#047857]",
                            item.type === "warning" && "bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]",
                            item.type === "error" && "bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]",
                            item.type === "info" && "bg-[#F0F9FF] border-[#BAE6FD] text-[#0369A1]"
                        )}
                    >
                        <div className="shrink-0 mt-0.5">
                            {item.type === "success" && <CheckCircle2 className="w-4 h-4 text-[#047857]" />}
                            {item.type === "warning" && <AlertTriangle className="w-4 h-4 text-[#B45309]" />}
                            {item.type === "error" && <AlertCircle className="w-4 h-4 text-[#B91C1C]" />}
                            {item.type === "info" && <Info className="w-4 h-4 text-[#0369A1]" />}
                        </div>

                        <div className="flex-1 text-left min-w-0">
                            <p className="text-[13px] font-semibold leading-5 text-[#0F172A]">{item.title}</p>
                            {item.description && (
                                <p className="text-[12px] leading-4 text-[#475569] mt-0.5">{item.description}</p>
                            )}
                        </div>

                        <button
                            onClick={() => dismiss(item.id)}
                            className="shrink-0 text-[#94A3B8] hover:text-[#0F172A] p-0.5 rounded transition-colors"
                            aria-label="Close notification"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast(): ToastContextType {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}
