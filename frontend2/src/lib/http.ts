import { API_BASE_URL, TOKEN_STORAGE_KEY } from "./config";

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

/* ---------------- Access token store ---------------- */

type TokenListener = (token: string | null) => void;

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

let currentToken = readStoredToken();
const listeners = new Set<TokenListener>();

export const tokenStore = {
  get: () => currentToken,
  set(token: string | null) {
    if (token === currentToken) return;
    currentToken = token;
    try {
      if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
      else localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      /* storage unavailable: keep the token in memory only */
    }
    listeners.forEach((listener) => listener(token));
  },
  subscribe(listener: TokenListener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/* ---------------- Refresh (cookie based) ---------------- */

let refreshInFlight: Promise<string | null> | null = null;

/**
 * POST /auth/refresh with the httpOnly `refreshToken` cookie.
 * Concurrent callers share one request.
 */
export function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, { method: "POST", credentials: "include" });
      const body = (await res.json().catch(() => null)) as { access_token?: string; accessToken?: string } | null;
      // The refresh handler answers with `access_token`; signin/signup use `accessToken`.
      const token = body?.access_token ?? body?.accessToken ?? null;
      if (res.ok && token) {
        tokenStore.set(token);
        return token;
      }
      if (res.status === 401) tokenStore.set(null);
      return null;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

/* ---------------- Request helper ---------------- */

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Attach the bearer token and retry once after a refresh on 401/403. */
  auth?: boolean;
  signal?: AbortSignal;
}

interface ApiBody {
  valid?: boolean;
  message?: unknown;
}

export async function request<T>(path: string, { method = "GET", body, auth = false, signal }: RequestOptions = {}): Promise<T> {
  const send = (token: string | null) => {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (auth && token) headers.Authorization = `Bearer ${token}`;
    return fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "include",
      signal,
    });
  };

  let res: Response;
  try {
    res = await send(tokenStore.get());
    if (auth && (res.status === 401 || res.status === 403)) {
      const fresh = await refreshAccessToken();
      if (fresh) res = await send(fresh);
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }

  const data = (await res.json().catch(() => null)) as ApiBody | null;
  // The backend sometimes answers 4xx/5xx and sometimes 200 with valid:false.
  if (!res.ok || !data || data.valid === false) {
    const message = typeof data?.message === "string" ? data.message : `Request failed (${res.status})`;
    throw new ApiError(message, res.status, data);
  }
  return data as T;
}
