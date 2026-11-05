import { google } from "googleapis";
import express from "express"
import { prisma } from "@repo/db";
import crypto from "crypto"
import { clearCookieOptions, cookieOptions } from "../helpers/cookie.js";

const CLIENT_ID = `${process.env.GOOGLE_AUTH_CLIENT_ID}`
const CLIENT_SECRET = `${process.env.GOOGLE_AUTH_CLIENT_SECRET}`
const REDIRECT_URL = `${process.env.REDIRECT_BACK_URL}`
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173"
const SESSION_MS = 25 * 24 * 60 * 60 * 1000
const STATE_MS = 10 * 60 * 1000

const fail = (res: express.Response, reason: "google_cancelled" | "google_failed", why: string, detail?: unknown) => {
    console.log(`[google callback] ${why}`, detail ?? "")
    return res.redirect(`${FRONTEND_URL}/login?error=${reason}`)
}

const authClient = new google.auth.OAuth2({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirectUri: REDIRECT_URL,
})

export function generateAuthUrl(state: string) {
    return authClient.generateAuthUrl({
        access_type: "offline",
        scope: ["openid", "email", "profile"],
        prompt: "select_account",
        state,
    })
}

/**
 * GET /auth/google/start
 * The browser navigates here (a normal page visit, not fetch), so the state cookie
 * is stored as a first-party cookie and comes back with Google's redirect.
 */
export async function googleStartHandler(_req: express.Request, res: express.Response) {
    try {
        const state = crypto.randomBytes(16).toString("hex")
        res.cookie("oauthState", state, cookieOptions(STATE_MS))
        res.redirect(generateAuthUrl(state))
    } catch (error) {
        return fail(res, "google_failed", "start failed", error)
    }
}

/** GET /auth/google/verify (REDIRECT_BACK_URL must point here, on the SAME host as /google/start). */
export async function googleAuthCallbackHandler(req: express.Request, res: express.Response) {
    try {
        const { code, state, error } = req.query as Record<string, string | undefined>
        if (error || !code) return fail(res, "google_cancelled", "no code", { error })

        const expected = req.cookies?.oauthState
        res.clearCookie("oauthState", clearCookieOptions)
        if (!state || state !== expected) return fail(res, "google_failed", "state mismatch", { state, cookie: expected })

        const { tokens } = await authClient.getToken(code)
        if (!tokens.id_token) return fail(res, "google_failed", "no id_token", { scope: tokens.scope })

        const ticket = await authClient.verifyIdToken({
            idToken: tokens.id_token,
            audience: CLIENT_ID, // was process.env.GOOGLE_CLIENT_ID (a different, likely unset, variable)
        })

        const profile = ticket.getPayload()
        if (!profile?.email || !profile.email_verified) return fail(res, "google_failed", "email not verified", profile)
        const email = profile.email.toLowerCase()

        const user = await prisma.users.upsert({
            where: { email },
            update: { lastLoggedIn: new Date() },
            create: {
                email,
                name: profile.name ?? email.split("@")[0]!,
                role: "USER",
                authMode: "GOOGLE",
                lastLoggedIn: new Date(),
            },
        })

        const refreshToken = crypto.randomBytes(32).toString("hex")
        const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex")
        await prisma.session.create({
            data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + SESSION_MS) },
        })

        res.cookie("refreshToken", refreshToken, cookieOptions(SESSION_MS))
        console.log("[google callback] ok", user.email)
        res.redirect(`${FRONTEND_URL}/auth/callback`)
    } catch (error) {
        return fail(res, "google_failed", "exception", error)
    }
}
