/**
 * In dev, requests go to /api/v1 on the Vite server, which proxies them to the real API
 * (see vite.config.ts). Same origin means the auth cookies just work on localhost.
 * In production, serve the frontend from the same site as the API (e.g. nginx: /api -> backend)
 * so the default "/api/v1" works there too, or set VITE_API_URL.
 */
export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? "/api/v1";

/** Notification server (payment links, inventory updates). */
export const WS_URL: string = import.meta.env.VITE_WS_URL ?? "ws://localhost:8080";

/** Change to your store currency (keep it in sync with components/admin/utils.ts). */
export const CURRENCY = "USD";

export const STORE_NAME = "MedLife";

/** Same key the old HomePage/WebSocket code read, so existing code keeps working. */
export const TOKEN_STORAGE_KEY = "accessToken";
export const CART_STORAGE_KEY = "medlife.cart";

/**
 * Seller details printed on invoices. Leave a field empty to omit it.
 * Built-in PDF fonts can't draw every currency symbol (₹ for example):
 * see components/store/invoice/InvoiceDocument.tsx if you change CURRENCY.
 */
export const SELLER = {
    name: STORE_NAME,
    addressLines: [] as string[],
    email: "",
    taxId: "",
};