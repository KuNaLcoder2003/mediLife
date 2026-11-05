import type { CookieOptions } from "express"

/**
 * One place for auth cookie settings.
 *
 * COOKIE_SECURE=true      only when the API is served over HTTPS.
 *                         Browsers silently drop `Secure` cookies sent over plain http
 *                         (except on localhost), which is why oauthState was "undefined".
 * COOKIE_CROSS_SITE=true  only if the frontend is on a different site than the API
 *                         (needs COOKIE_SECURE=true / HTTPS). Prefer same-site hosting instead.
 */
const secure = process.env.COOKIE_SECURE === "true"
const crossSite = secure && process.env.COOKIE_CROSS_SITE === "true"

const base: CookieOptions = {
    httpOnly: true,
    secure,
    sameSite: crossSite ? "none" : "lax",
    path: "/",
}

export const cookieOptions = (maxAge: number): CookieOptions => ({ ...base, maxAge })

/** clearCookie must use the same attributes the cookie was set with. */
export const clearCookieOptions: CookieOptions = base
