import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import FullPageLoader from "../components/store/FullPageLoader";
import { useAuth } from "./auth-context";

interface ProtectedRouteProps {
  /** Allowed token roles, e.g. ["COMPANY"] for the admin panel. */
  roles?: string[];
  children?: ReactNode;
}

/** Wrap a route (or a group via <Outlet/>) that needs a signed-in user. */
export default function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const { status, role } = useAuth();
  const location = useLocation();

  if (status === "checking") return <FullPageLoader label="Checking your session…" />;

  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  // If the token carries no role claim we let the server decide.
  if (roles && role && !roles.includes(role)) return <Navigate to="/" replace />;

  return children ? <>{children}</> : <Outlet />;
}

/** For /login: send signed-in users back to where they were going. */
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  if (status === "checking") return <FullPageLoader label="Checking your session…" />;
  if (status === "authenticated") return <Navigate to={from} replace />;
  return <>{children}</>;
}
