import { createContext, useContext } from "react";
import type { SignUpDetails, User } from "../lib/types";

export type AuthStatus = "checking" | "authenticated" | "anonymous";

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /** `role` claim read from the access token, if present ("USER" | "COMPANY"). */
  role: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (details: SignUpDetails) => Promise<void>;
  signOut: () => Promise<void>;
  reloadUser: () => Promise<User | null>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
