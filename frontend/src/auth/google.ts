import { API_BASE_URL } from "../lib/config";

/** Where to send the user after Google brings them back to /auth/callback. */
export const RETURN_TO_KEY = "auth.returnTo";

/**
 * Remember where the user was going, then navigate (not fetch) to the API's
 * GET /auth/google/start. A real page visit lets the server's state cookie be
 * stored first-party, so it comes back with Google's redirect.
 */
export function startGoogleSignIn(returnTo: string): void {
  try {
    sessionStorage.setItem(RETURN_TO_KEY, returnTo);
  } catch {
    /* storage unavailable: the callback falls back to "/" */
  }
  window.location.assign(`${API_BASE_URL}/auth/google/start`);
}
