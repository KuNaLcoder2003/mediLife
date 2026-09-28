import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../../auth/auth-context";
import { WS_URL } from "../../lib/config";
import { refreshAccessToken, tokenStore } from "../../lib/http";
import {
    RealtimeContext,
    type RealtimeContextValue,
    type RealtimeListener,
    type RealtimeStatus,
    type ServerMessage,
} from "../../lib/realtime-context";

const MAX_BACKOFF_MS = 30_000;

function parseMessage(raw: unknown): ServerMessage | null {
    if (typeof raw !== "string") return null;
    try {
        const data: unknown = JSON.parse(raw);
        if (data && typeof data === "object" && typeof (data as { type?: unknown }).type === "string") {
            return data as ServerMessage;
        }
    } catch {
        /* plain-text messages (e.g. a greeting) are ignored */
    }
    return null;
}

/**
 * Keeps one authenticated WebSocket open while the user is signed in,
 * reconnects with backoff, and fans messages out to subscribers.
 */
export default function RealtimeProvider({ children }: { children: ReactNode }) {
    const { status: authStatus } = useAuth();
    const listeners = useRef(new Set<RealtimeListener>());
    const [session, setSession] = useState(0); // bumped by reconnect()
    const [state, setState] = useState<{ session: number; status: RealtimeStatus }>({ session: -1, status: "connecting" });

    useEffect(() => {
        if (authStatus !== "authenticated") return;

        let socket: WebSocket | null = null;
        let retryTimer: number | undefined;
        let retries = 0;
        let disposed = false;
        let triedRefresh = false;

        const report = (status: RealtimeStatus) => {
            if (!disposed) setState({ session, status });
        };

        const authenticate = (token: string | null) => {
            if (token && socket?.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: "Authentication", token }));
            }
        };

        const connect = () => {
            if (disposed) return;
            socket = new WebSocket(WS_URL);

            socket.onopen = () => {
                triedRefresh = false;
                authenticate(tokenStore.get());
            };

            socket.onmessage = (event) => {
                const message = parseMessage(event.data);
                if (!message) return;

                if (message.type === "AUTHENTICATED") {
                    retries = 0;
                    report("ready");
                } else if (message.type === "UNAUTHENTICATED") {
                    // Usually an expired access token: refresh once and try again.
                    if (!triedRefresh) {
                        triedRefresh = true;
                        void refreshAccessToken().then(authenticate);
                    }
                }
                listeners.current.forEach((listener) => listener(message));
            };

            socket.onclose = () => {
                if (disposed) return;
                report("offline");
                const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** retries++);
                retryTimer = window.setTimeout(connect, delay);
            };
        };

        connect();

        return () => {
            disposed = true;
            window.clearTimeout(retryTimer);
            socket?.close();
        };
    }, [authStatus, session]);

    const subscribe = useCallback((listener: RealtimeListener) => {
        listeners.current.add(listener);
        return () => {
            listeners.current.delete(listener);
        };
    }, []);

    const reconnect = useCallback(() => setSession((s) => s + 1), []);

    const status: RealtimeStatus =
        authStatus !== "authenticated" ? "idle" : state.session === session ? state.status : "connecting";

    const value = useMemo<RealtimeContextValue>(() => ({ status, subscribe, reconnect }), [status, subscribe, reconnect]);

    return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}