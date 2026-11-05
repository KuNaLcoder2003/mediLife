import { CURRENCY } from "./config";

const priceFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: CURRENCY,
  maximumFractionDigits: 2,
});

export const formatPrice = (value: number) => priceFormatter.format(value);

/** Discount is stored as a percentage (0–100). */
export function discountPct(discount: number | null | undefined): number {
  return Math.min(Math.max(discount ?? 0, 0), 100);
}

export function unitPrice(price: number, discount: number | null | undefined): number {
  return price * (1 - discountPct(discount) / 100);
}

export function errorMessage(err: unknown, fallback = "Something went wrong. Try again."): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function firstName(name: string | undefined | null): string {
  return (name ?? "").trim().split(/\s+/)[0] ?? "";
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? "" : dateFormatter.format(date);
}

/** Last 8 characters of an ID, for display ("#8Q2ZXH6"). The full ID stays on the invoice. */
export function shortId(id: string): string {
  return id.slice(-8).toUpperCase();
}