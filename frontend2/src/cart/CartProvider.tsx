import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { CART_STORAGE_KEY } from "../lib/config";
import type { Product } from "../lib/types";
import { CartContext, type CartContextValue, type CartItem } from "./cart-context";

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CartItem[]).filter((i) => i && typeof i.productId === "string") : [];
  } catch {
    return [];
  }
}

const clamp = (qty: number, stock: number) => Math.max(1, Math.min(Math.floor(qty) || 1, Math.max(stock, 1)));

function toItem(product: Product, quantity: number): CartItem {
  return {
    productId: product.id,
    productName: product.productName,
    price: product.price,
    discount: product.discount,
    imageUrl: product.images?.[0]?.imageUrl ?? null,
    category: product.category?.category ?? null,
    stock: product.quantity,
    quantity: clamp(quantity, product.quantity),
  };
}

export default function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage full or unavailable */
    }
  }, [items]);

  const add = useCallback((product: Product, quantity = 1) => {
    if (product.quantity <= 0) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (!existing) return [...prev, toItem(product, quantity)];
      return prev.map((i) => (i.productId === product.id ? toItem(product, i.quantity + quantity) : i));
    });
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity: clamp(quantity, i.stock) } : i)));
  }, []);

  const remove = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const sync = useCallback((products: Product[]) => {
    const byId = new Map(products.map((p) => [p.id, p]));
    setItems((prev) =>
      prev.map((i) => {
        const fresh = byId.get(i.productId);
        return fresh ? { ...toItem(fresh, i.quantity), quantity: fresh.quantity > 0 ? clamp(i.quantity, fresh.quantity) : i.quantity } : i;
      }),
    );
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((sum, i) => sum + i.quantity, 0),
      add,
      setQuantity,
      remove,
      clear,
      sync,
    }),
    [items, add, setQuantity, remove, clear, sync],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
