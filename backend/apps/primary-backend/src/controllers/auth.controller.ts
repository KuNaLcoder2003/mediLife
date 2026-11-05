import express from "express"
import { prisma } from "@repo/db"
import { generateToken } from "../helpers/users.js"
import crypto from "crypto"
import { generateAuthUrl } from "../utility/google.js"
import { clearCookieOptions, cookieOptions } from "../helpers/cookie.js"

export const refreshHandler = async (req: express.Request, res: express.Response) => {
    try {
        const refreshToken = req.cookies?.refreshToken
        if (!refreshToken) {
            res.status(401).json({ message: "Invalid token", valid: false })
            return
        }
        const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex")
        const session = await prisma.session.findUnique({
            where: { tokenHash, expiresAt: { gte: new Date() } },
            select: { id: true, user: { select: { id: true, email: true, role: true } } },
        })
        if (!session) {
            res.status(401).json({ message: "Session expired", valid: false })
            return
        }
        const token = generateToken(session.user.id, session.user.email, session.user.role)
        res.status(200).json({ access_token: token, valid: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Something went wrong", valid: false })
    }
}

export const logout = async (req: express.Request, res: express.Response) => {
    try {
        const refreshToken = req.cookies?.refreshToken as string | undefined
        if (refreshToken) {
            const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex")
            // deleteMany: doesn't throw when the session is already gone
            await prisma.session.deleteMany({ where: { tokenHash } })
        }
        res.clearCookie("refreshToken", clearCookieOptions)
        res.status(200).json({ message: "Logged out", valid: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Something went wrong", valid: false })
    }
}

/** Old flow (POST + fetch). The cookie it sets is usually dropped by the browser; use GET /google/start. */
export const authUsingGoogle = async (_req: express.Request, res: express.Response) => {
    try {
        const state = crypto.randomBytes(16).toString("hex")
        res.cookie("oauthState", state, cookieOptions(10 * 60 * 1000))
        res.status(200).json({ url: generateAuthUrl(state), valid: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Something went wrong", valid: false })
    }
}

/** Use the same helper wherever signIn/signUp set the refresh cookie: */
export const setRefreshCookie = (res: express.Response, refreshToken: string, maxAgeMs: number) =>
    res.cookie("refreshToken", refreshToken, cookieOptions(maxAgeMs))
