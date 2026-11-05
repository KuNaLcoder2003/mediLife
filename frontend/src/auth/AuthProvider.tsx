import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi, userApi } from "../lib/api";
import { ApiError, refreshAccessToken, tokenStore } from "../lib/http";
import type { SignUpDetails, User } from "../lib/types";
import { AuthContext, type AuthContextValue, type AuthStatus } from "./auth-context";

function readRole(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.role === "string" ? json.role : null;
  } catch {
    return null;
  }
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => tokenStore.get());
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("checking");

  // Keep React in sync with the token store (refresh, logout, failed refresh).
  useEffect(
    () =>
      tokenStore.subscribe((next) => {
        setToken(next);
        if (!next) {
          setUser(null);
          setStatus("anonymous");
        }
      }),
    [],
  );

  // On load: use the stored access token, or try the refresh cookie
  // (this is also how a Google sign-in lands, since that flow only sets the cookie).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const existing = tokenStore.get() ?? (await refreshAccessToken());
      if (!existing) {
        if (!cancelled) setStatus("anonymous");
        return;
      }
      try {
        const me = await userApi.me();
        if (cancelled) return;
        setUser(me);
        setStatus("authenticated");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status !== 0) tokenStore.set(null);
        setStatus("anonymous");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const finishLogin = useCallback(async (accessToken: string) => {
    tokenStore.set(accessToken);
    const me = await userApi.me();
    setUser(me);
    setStatus("authenticated");
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => finishLogin(await authApi.signIn(email, password)),
    [finishLogin],
  );

  const signUp = useCallback(
    async (details: SignUpDetails) => finishLogin(await authApi.signUp(details)),
    [finishLogin],
  );

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* the server route may not exist yet; clear the local session anyway */
    }
    tokenStore.set(null);
  }, []);

  const reloadUser = useCallback(async () => {
    try {
      const me = await userApi.me();
      setUser(me);
      return me;
    } catch {
      return null;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, role: readRole(token), signIn, signUp, signOut, reloadUser }),
    [status, user, token, signIn, signUp, signOut, reloadUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
