import { createContext, useContext } from "react";

/** Messages the notification server sends (see the updated ws server). */
export type ServerMessage =
    | { type: "AUTHENTICATED" }
    | { type: "UNAUTHENTICATED" }
    | { type: "PAYMENT_LINK_CREATED"; orderId?: string; paymentUrl: string }
    | { type: "INVENTORY_UNAVAILABLE"; orderId?: string; message?: string; details?: unknown };

/**
 * idle: signed out, no socket
 * connecting: socket opening / waiting for the server to accept the token
 * ready: authenticated, notifications will arrive
 * offline: connection lost, retrying with backoff
 */
export type RealtimeStatus = "idle" | "connecting" | "ready" | "offline";

export type RealtimeListener = (message: ServerMessage) => void;

export interface RealtimeContextValue {
    status: RealtimeStatus;
    /** Returns an unsubscribe function. */
    subscribe: (listener: RealtimeListener) => () => void;
    /** Drop the current connection and reconnect immediately. */
    reconnect: () => void;
}

export const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function useRealtime(): RealtimeContextValue {
    const ctx = useContext(RealtimeContext);
    if (!ctx) throw new Error("useRealtime must be used inside <RealtimeProvider>");
    return ctx;
}