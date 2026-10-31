import type { Order } from "./api";
import { revenueOf } from "./reports";

export const initials = (name: string) =>
  name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

export interface CustomerStats {
  orders: number;
  spent: number;
  last?: string; // date of the latest order
}

// Orders, total spent and last order for every customer, worked out from the orders list
export const statsByCustomer = (orders: Order[]) => {
  const grouped = new Map<string, Order[]>();
  for (const o of orders) grouped.set(o.userId, [...(grouped.get(o.userId) ?? []), o]);

  const result = new Map<string, CustomerStats>();
  for (const [userId, list] of grouped) {
    const last = list.reduce((latest, o) => (o.createdAt > latest ? o.createdAt : latest), "");
    result.set(userId, { orders: list.length, spent: revenueOf(list), last: last || undefined });
  }
  return result;
};