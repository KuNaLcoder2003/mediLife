import { useEffect, useState } from "react";

/** Change this to your store currency. */
export const CURRENCY = "USD";
export const LOW_STOCK_THRESHOLD = 10;

const priceFormatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 2,
});

export const formatPrice = (value: number) => priceFormatter.format(value);

/** `discount` is treated as a percentage (0–100). */
export function discountedPrice(price: number, discount: number | null | undefined): number {
    const pct = Math.min(Math.max(discount ?? 0, 0), 100);
    return price * (1 - pct / 100);
}

export type StockLevel = "out" | "low" | "ok";

export function stockLevel(quantity: number): StockLevel {
    if (quantity <= 0) return "out";
    if (quantity <= LOW_STOCK_THRESHOLD) return "low";
    return "ok";
}

export function errorMessage(err: unknown, fallback = "Something went wrong. Try again."): string {
    return err instanceof Error && err.message ? err.message : fallback;
}

export function useDebouncedValue<T>(value: T, delay = 300): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = window.setTimeout(() => setDebounced(value), delay);
        return () => window.clearTimeout(id);
    }, [value, delay]);
    return debounced;
}