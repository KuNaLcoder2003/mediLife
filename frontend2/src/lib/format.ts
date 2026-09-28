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
