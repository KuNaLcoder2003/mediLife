export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";

/** Notification server (payment links, inventory updates). */
export const WS_URL: string = import.meta.env.VITE_WS_URL ?? "ws://localhost:8080";

/** Change to your store currency (keep it in sync with components/admin/utils.ts). */
export const CURRENCY = "USD";

export const STORE_NAME = "Medlinks";

/** Same key the old HomePage/WebSocket code read, so existing code keeps working. */
export const TOKEN_STORAGE_KEY = "accessToken";
export const CART_STORAGE_KEY = "medlinks.cart";