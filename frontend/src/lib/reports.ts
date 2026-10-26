import type { Order, OrderLine, Product } from "./api";

export const DAY = 86_400_000;

const time = (o: Order) => new Date(o.createdAt).getTime();

export const isCancelled = (o: Order) => o.status === "CANCELLED";
// Cancelled and returned orders don't count as revenue
export const countsAsRevenue = (o: Order) => o.status !== "CANCELLED" && o.status !== "RETURNED";

export const inWindow = (orders: Order[], from: number, to: number) =>
  orders.filter((o) => time(o) >= from && time(o) < to);

export const productMap = (products: Product[]) => new Map(products.map((p) => [p.id, p]));

const netOf = (o: Order) => o.orderTotal;

export const revenueOf = (orders: Order[]) =>
  orders.filter(countsAsRevenue).reduce((sum, o) => sum + netOf(o), 0);

export const lineAmount = (l: OrderLine, p?: Product) => (l.unitPrice ?? p?.price ?? 0) * (l.quantity ?? 1);

export const discountsOf = (orders: Order[], byId: Map<string, Product>) =>
  orders.filter(countsAsRevenue).reduce(
    (sum, o) =>
      sum +
      o.orderedProducts.reduce((s, l) => {
        const p = byId.get(l.product.id);
        return s + lineAmount(l, p) * ((p?.discount ?? 0) / 100);
      }, 0),
    0,
  );

export const summarize = (orders: Order[], byId: Map<string, Product>) => {
  const cancelled = orders.filter(isCancelled).length;
  return {
    count: orders.length,
    revenue: revenueOf(orders),
    discounts: discountsOf(orders, byId),
    cancelRate: orders.length ? (cancelled / orders.length) * 100 : 0,
  };
};

// Percent change, or null when there is nothing to compare with
export const pctChange = (cur: number, prev: number) => (prev === 0 ? null : ((cur - prev) / prev) * 100);

export interface Month { key: string; label: string; partial: boolean; cur: number; prev: number }

// Revenue per month for the last `months` months, next to the same month a year earlier
export const monthlySeries = (orders: Order[], now: number, months = 6): Month[] => {
  const d = new Date(now);
  return Array.from({ length: months }, (_, i) => {
    const start = new Date(d.getFullYear(), d.getMonth() - (months - 1 - i), 1);
    const sumFor = (year: number) =>
      revenueOf(inWindow(orders, new Date(year, start.getMonth(), 1).getTime(), new Date(year, start.getMonth() + 1, 1).getTime()));
    return {
      key: `${start.getFullYear()}-${start.getMonth()}`,
      label: start.toLocaleDateString("en-GB", { month: "short" }),
      partial: i === months - 1, // the current month is still in progress
      cur: sumFor(start.getFullYear()),
      prev: sumFor(start.getFullYear() - 1),
    };
  });
};

export const byCategory = (orders: Order[], byId: Map<string, Product>) => {
  const totals = new Map<string, number>();
  for (const o of orders.filter(countsAsRevenue)) {
    for (const l of o.orderedProducts) {
      const p = byId.get(l.product.id);
      const name = p?.category?.category ?? "Uncategorised";
      totals.set(name, (totals.get(name) ?? 0) + lineAmount(l, p));
    }
  }
  const sum = [...totals.values()].reduce((a, b) => a + b, 0);
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => ({ name, amount, share: sum ? (amount / sum) * 100 : 0 }));
};

export const topProducts = (orders: Order[], byId: Map<string, Product>, limit = 5) => {
  const rows = new Map<string, { id: string; name: string; orders: number; revenue: number }>();
  for (const o of orders.filter(countsAsRevenue)) {
    for (const l of o.orderedProducts) {
      const row = rows.get(l.product.id) ?? { id: l.product.id, name: l.product.productName, orders: 0, revenue: 0 };
      row.orders += 1;
      row.revenue += lineAmount(l, byId.get(l.product.id));
      rows.set(l.product.id, row);
    }
  }
  return [...rows.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
    .map((r) => {
      const p = byId.get(r.id);
      return { ...r, category: p?.category?.category ?? "—", available: p ? p.quantity - (p.reservedQuantity ?? 0) : null };
    });
};

// A tidy step for the chart's y axis (3 steps from 0 to the top)
export const niceStep = (max: number) => {
  if (max <= 0) return 1;
  const raw = max / 3;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
};

export const compact = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(n);

export const downloadCsv = (filename: string, rows: (string | number)[][]) => {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const blob = new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};