/**
 * Formatters for DealFlow360
 *
 * NOTE: Currency is dynamic and based on the currency code returned by the backend/quotation.
 * Default presentation currency is "INR" as requested, but currency is never hard-coded as a business rule.
 * Tabular numerals must be applied where rendered.
 */

export function formatCurrency(
    amount: number | string | null | undefined,
    currency: string = "INR",
    options?: {
        minimumFractionDigits?: number;
        maximumFractionDigits?: number;
    }
): string {
    if (amount === null || amount === undefined || amount === "") {
        return "—";
    }

    const numericValue = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(numericValue)) {
        return "—";
    }

    const minDigits = options?.minimumFractionDigits ?? 2;
    const maxDigits = options?.maximumFractionDigits ?? 2;

    try {
        const locale = currency.toUpperCase() === "INR" ? "en-IN" : "en-US";
        return new Intl.NumberFormat(locale, {
            style: "currency",
            currency: currency.toUpperCase(),
            minimumFractionDigits: minDigits,
            maximumFractionDigits: maxDigits,
        }).format(numericValue);
    } catch {
        // Fallback in case of an uncommon currency code
        return `${currency.toUpperCase()} ${numericValue.toFixed(minDigits)}`;
    }
}

export function formatPercentage(
    value: number | string | null | undefined,
    options?: {
        decimals?: number;
        includeSign?: boolean;
    }
): string {
    if (value === null || value === undefined || value === "") {
        return "—";
    }

    const numericValue = typeof value === "string" ? parseFloat(value) : Number(value);
    if (isNaN(numericValue)) {
        return "—";
    }

    const decimals = options?.decimals ?? 1;
    const formatted = numericValue.toFixed(decimals);
    const sign = options?.includeSign && numericValue > 0 ? "+" : "";

    return `${sign}${formatted}%`;
}

export function formatNumber(
    value: number | string | null | undefined,
    options?: {
        decimals?: number;
    }
): string {
    if (value === null || value === undefined || value === "") {
        return "—";
    }

    const numericValue = typeof value === "string" ? parseFloat(value) : Number(value);
    if (isNaN(numericValue)) {
        return "—";
    }

    const decimals = options?.decimals ?? 0;
    return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(numericValue);
}

export function formatDate(
    date: Date | string | number | null | undefined,
    format: "short" | "medium" | "long" = "medium"
): string {
    if (!date) return "—";

    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";

    if (format === "short") {
        return d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
    }

    if (format === "long") {
        return d.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    }

    return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

export function formatDateTime(
    date: Date | string | number | null | undefined
): string {
    if (!date) return "—";

    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";

    return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}

export function formatRelativeTime(
    date: Date | string | number | null | undefined
): string {
    if (!date) return "—";

    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return formatDate(date, "short");
}
