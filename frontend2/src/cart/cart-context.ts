import { createContext, useContext } from "react";
import type { Product } from "../lib/types";

export interface CartItem {
  productId: string;
  productName: string;
  price: number;
  discount: number | null;
  imageUrl: string | null;
  category: string | null;
  /** Stock when last seen; quantity is capped to this. */
  stock: number;
  quantity: number;
}

export interface CartContextValue {
  items: CartItem[];
  /** Total units across all lines. */
  count: number;
  add: (product: Product, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  /** Refresh price, discount and stock from fresh product data. */
  sync: (products: Product[]) => void;
}

export const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
