import { Navigate } from "react-router-dom";
import { useAuth } from "../../auth/auth-context";
import FullPageLoader from "../../components/store/FullPageLoader";

export const RETURN_TO_KEY = "auth.returnTo";

export default function AuthCallbackPage() {
    const { status } = useAuth(); // AuthProvider is calling /auth/refresh right now

    if (status === "checking") return <FullPageLoader label="Signing you in…" />;
    if (status === "authenticated") {
        const returnTo = sessionStorage.getItem(RETURN_TO_KEY) ?? "/";
        sessionStorage.removeItem(RETURN_TO_KEY);
        return <Navigate to={returnTo} replace />;
    }
    return <Navigate to="/login?error=google_failed" replace />;
}