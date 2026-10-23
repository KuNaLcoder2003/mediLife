import type { Order } from "./api";

export type Tab = "all" | "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

export const TABS: [Tab, string][] = [
  ["all", "All"],
  ["pending", "Pending"],
  ["confirmed", "Confirmed"],
  ["shipped", "Shipped"],
  ["delivered", "Delivered"],
  ["cancelled", "Cancelled"],
];

export const STATUS_INFO: Record<string, { label: string; tone: string; tab: Exclude<Tab, "all"> }> = {
  CREATED: { label: "Pending", tone: "amber", tab: "pending" },
  CONFIRMED: { label: "Confirmed", tone: "blue", tab: "confirmed" },
  PACKING: { label: "Packing", tone: "blue", tab: "confirmed" },
  SHIPPED: { label: "Shipped", tone: "purple", tab: "shipped" },
  DISPATCHED: { label: "Dispatched", tone: "purple", tab: "shipped" },
  DELIVERED: { label: "Delivered", tone: "green", tab: "delivered" },
  CANCELLED: { label: "Cancelled", tone: "red", tab: "cancelled" },
  RETURNED: { label: "Returned", tone: "red", tab: "cancelled" },
};

export const statusInfo = (status?: string): { label: string; tone: string; tab: Exclude<Tab, "all"> | null } =>
  (status ? STATUS_INFO[status] : undefined) ?? { label: "—", tone: "grey", tab: null };

export const PAY_INFO: Record<string, { label: string; tone: string }> = {
  COMPLETED: { label: "Paid", tone: "green" },
  PENDING: { label: "Pending", tone: "amber" },
  FAILED: { label: "Failed", tone: "red" },
  CANCELLED: { label: "Cancelled", tone: "red" },
};

export const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// Order ids are long; the design shows the first 8 characters
export const shortId = (id: string) => id.slice(0, 8);

export const fmtDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })
    : "—";

export const fmtLong = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })
    : "—";

export const monthYear = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "—";

export const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const itemCount = (o: Order) =>
  o.orderedProducts.reduce((sum, line) => sum + (line.quantity ?? 1), 0);