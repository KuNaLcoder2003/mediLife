import { google } from "googleapis";
import express from "express"
import { createUser, generateToken, getUserAuth } from "../helpers/users.js";
import { prisma } from "@repo/db";
import crypto from "crypto"

const CLIENT_ID = `${process.env.GOOGLE_AUTH_CLIENT_ID}`
const CLIENT_SECRET = `${process.env.GOOGLE_AUTH_CLIENT_SECRET}`
const REDIRECT_URL = `${process.env.REDIRECT_BACK_URL}`
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173"
const SESSION_MS = 25 * 24 * 60 * 60 * 1000
const fail = (res: express.Response, reason: "google_cancelled" | "google_failed") =>
    res.redirect(`${FRONTEND_URL}/login?error=${reason}`)

const scopes = ["https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"]
export async function generateAuthUrl(state: string) {
    const oAuthClient = new google.auth.OAuth2({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirectUri: REDIRECT_URL
    })

    const url = oAuthClient.generateAuthUrl({
        access_type: "offline",
        scope: ["openid", "email", "profile"],
        prompt: "select_account",
        state: "http://localhost:5173/home"
    })
    if (!url) {
        return false
    } else {
        return url
    }
}

const authClient = new google.auth.OAuth2({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirectUri: REDIRECT_URL
})


export const authUsingGoogle = async (req: express.Request, res: express.Response) => {
    try {
        const state = crypto.randomBytes(16).toString("hex")
        res.cookie("oauthState", state, {
            httpOnly: true,
            secure: true,
            sameSite: "lax",       // still sent when Google redirects back (top-level GET)
            maxAge: 10 * 60 * 1000,
        })
        const url = await generateAuthUrl(state)
        res.status(200).json({ url, valid: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Something went wrong", valid: false })
    }
}

export async function googleAuthCallbackHandler(req: express.Request, res: express.Response) {

    try {

        const { code, state, error } = req.query as Record<string, string | undefined>
        if (error || !code) return fail(res, "google_cancelled")

        if (!state || state !== req.cookies.oauthState) return fail(res, "google_failed")
        res.clearCookie("oauthState")

        // get the tokens
        const { tokens } = await authClient.getToken(code as string)
        if (!tokens.id_token) return fail(res, "google_failed")
        const ticket = await authClient.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID!
        })

        const profile = ticket.getPayload()
        if (!profile?.email || !profile.email_verified) return fail(res, "google_failed")
        const email = profile.email.toLowerCase()



        // setting the refresh tokens

        // sending out a db call -> if the user is found then update the tokens in the db and if not then create new user
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

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            maxAge: SESSION_MS
        });

        res.redirect(`${FRONTEND_URL}/auth/callback`);
    } catch (error) {
        console.log(error)
        return fail(res, "google_failed")
    }

}

