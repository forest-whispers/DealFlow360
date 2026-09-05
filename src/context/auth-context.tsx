"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";

export interface UserProfile {
    id: string;
    organizationId: string;
    name: string;
    email: string;
    role: "ADMIN" | "SALES_REP" | "SALES_MANAGER" | "FINANCE_OPERATIONS" | "CUSTOMER";
}

export interface SignupCredentials {
    organizationName: string;
    organizationSlug: string;
    name: string;
    email: string;
    password: string;
}

export interface LoginCredentials {
    organizationSlug: string;
    email: string;
    password: string;
}

interface AuthContextType {
    user: UserProfile | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isCustomer: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    signup: (credentials: SignupCredentials) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    hasRole: (...roles: Array<UserProfile["role"]>) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const router = useRouter();

    const refreshUser = useCallback(async () => {
        try {
            const res = await apiClient.get<{ user: UserProfile }>(API_ROUTES.AUTH.ME);
            if (res && res.user) {
                setUser(res.user);
            } else {
                setUser(null);
            }
        } catch {
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        apiClient
            .get<{ user: UserProfile }>(API_ROUTES.AUTH.ME)
            .then((res) => {
                if (isMounted) {
                    setUser(res?.user || null);
                    setIsLoading(false);
                }
            })
            .catch(() => {
                if (isMounted) {
                    setUser(null);
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const login = async (credentials: LoginCredentials) => {
        setIsLoading(true);
        try {
            const res = await apiClient.post<{ user: UserProfile }>(API_ROUTES.AUTH.LOGIN, credentials);
            if (res && res.user) {
                setUser(res.user);
                setIsLoading(false);
                if (res.user.role === "CUSTOMER") {
                    router.replace("/portal/quotations");
                } else {
                    router.replace("/dashboard");
                }
                router.refresh();
            } else {
                setIsLoading(false);
            }
        } catch (error) {
            setIsLoading(false);
            throw error;
        }
    };

    const signup = async (credentials: SignupCredentials) => {
        setIsLoading(true);
        try {
            const res = await apiClient.post<{ user: UserProfile }>(API_ROUTES.AUTH.SIGNUP, credentials);
            if (res && res.user) {
                setUser(res.user);
                setIsLoading(false);
                if (res.user.role === "CUSTOMER") {
                    router.replace("/portal/quotations");
                } else {
                    router.replace("/dashboard");
                }
                router.refresh();
            } else {
                setIsLoading(false);
            }
        } catch (error) {
            setIsLoading(false);
            throw error;
        }
    };

    const logout = async () => {
        setIsLoading(true);
        try {
            await apiClient.post(API_ROUTES.AUTH.LOGOUT);
        } catch {
            // Proceed with client cleanup regardless of network error
        } finally {
            setUser(null);
            setIsLoading(false);
            router.replace("/login");
            router.refresh();
        }
    };

    const hasRole = (...roles: Array<UserProfile["role"]>) => {
        if (!user) return false;
        return roles.includes(user.role);
    };

    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticated: !!user,
        isCustomer: user?.role === "CUSTOMER",
        login,
        signup,
        logout,
        refreshUser,
        hasRole,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
