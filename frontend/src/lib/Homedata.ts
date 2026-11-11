import type { ComponentType } from "react";
import type { Category, Order, Product } from "./api";
import { discountPct, unitPrice } from "./format";
import { DropIcon, HomeIcon, MaskIcon, PillIcon, PulseIcon, WalkerIcon } from "../components/store/auth/Icons";

export interface ProductView {
  id: string;
  name: string;
  category: string;
  price: number;
  finalPrice: number;
  pct: number;
  quantity: number;
  image?: string;

  raw: Product;
}

export function toView(p: Product, categories: Category[]): ProductView {
  const pct = discountPct(p.discount);
  return {
    id: p.id,
    name: p.productName,
    category: p.category?.category ?? categories.find((c) => c.id === p.categoryId)?.category ?? "",
    price: p.price,
    finalPrice: unitPrice(p.price, pct),
    pct,
    quantity: p.quantity,
    image: p.images?.[0]?.imageUrl,
    raw: p,
  };
}

export const categoryIcon = (name: string): ComponentType => {
  const n = name.toLowerCase();
  if (/diagnos|monitor|pulse|oxi|thermo/.test(n)) return PulseIcon;
  if (/diabet|glucose|sugar|insulin/.test(n)) return DropIcon;
  if (/ppe|hygiene|mask|glove|sanit/.test(n)) return MaskIcon;
  if (/mobil|walker|cane|wheel|support|brace/.test(n)) return WalkerIcon;
  if (/home|first|care/.test(n)) return HomeIcon;
  return PillIcon; // wound care, medicines and anything else
};

export function toneOf(name: string): number {
  let h = 0;
  for (const ch of name.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 6;
}

export interface CategoryStat {
  id: string;
  name: string;
  count: number;
  minPrice: number;
}

export function categoryStats(views: ProductView[], categories: Category[]): CategoryStat[] {
  return categories.map((c) => {
    const items = views.filter((v) => v.category.toLowerCase() === c.category.toLowerCase());
    return {
      id: c.id,
      name: c.category,
      count: items.length,
      minPrice: items.length ? Math.min(...items.map((v) => v.finalPrice)) : 0,
    };
  });
}

export function reorderCandidates(orders: Order[]): { id: string; date: string }[] {
  const seen = new Set<string>();
  const out: { id: string; date: string }[] = [];
  for (const o of orders) {
    for (const line of o.orderedProducts ?? []) {
      const id = line.product?.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push({ id, date: o.createdAt });
    }
  }
  return out;
}