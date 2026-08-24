import { google } from "googleapis";
import express from "express"
import { createUser, generateToken, getUserAuth } from "../helpers/users.js";
import { prisma } from "@repo/db";
import crypto from "crypto"

const CLIENT_ID = `${process.env.GOOGLE_AUTH_CLIENT_ID}`
const CLIENT_SECRET = `${process.env.GOOGLE_AUTH_CLIENT_SECRET}`
const REDIRECT_URL = `${process.env.REDIRECT_BACK_URL}`

const scopes = ["https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"]
export async function generateAuthUrl() {
    const oAuthClient = new google.auth.OAuth2({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirectUri: REDIRECT_URL
    })

    const url = oAuthClient.generateAuthUrl({
        access_type: "offline",
        scope: scopes,
        prompt: "consent",
        state: "https://app.edgeframe-solutions.com"
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

export async function googleAuthCallbackHandler(req: express.Request, res: express.Response) {
    const code = req.query.code as string;
    if (!code) {
        return
    }

    // create oAuth2 instance with the authClient and version2

    const oauth2 = google.oauth2({
        auth: authClient,
        version: "v2",
    });

    // get the tokens
    const { tokens } = await authClient.getToken(code as string)
    authClient.setCredentials({
        refresh_token: tokens.refresh_token as string
    })

    const userInfo = await oauth2.userinfo.get()
    if (!userInfo || !userInfo.data) {
        res.redirect("http:/localhost:5173/error")
        return
    }

    // setting the refresh tokens

    // sending out a db call -> if the user is found then update the tokens in the db and if not then create new user
    const user = await getUserAuth(userInfo.data.email as string, "")
    let token: string = ""
    let accessToken: string = ""
    if (!user || !user.user) {
        const newUser = await createUser({ email: userInfo.data.email as string, gender: userInfo.data.gender as ("MALE" | "FEMALE"), country: "Australia", role: "USER", authMode: "GOOGLE", name: userInfo.data.name as string })
        if (!newUser) {
            res.redirect("http:/localhost:5173/error")
            return
        }
        const refreshToken = crypto.hash("sha256", `${newUser.id}_${newUser.name}_${new Date().toString()}`)
        const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex")
        token = refreshToken
        await prisma.session.create({
            data: {
                tokenHash: tokenHash,
                userId: newUser.id,
                expiresAt: new Date(new Date().setDate(new Date().getDate() + 25))
            }
        })
        accessToken = generateToken(newUser.id, newUser.email, newUser.role)
    }
    else {
        const refreshToken = crypto.hash("sha256", `${user.user.id}_${user.user.name}_${new Date().toString()}`)
        const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex")
        token = refreshToken
        await prisma.session.create({
            data: {
                userId: user.user.id,
                tokenHash: tokenHash,
                expiresAt: new Date(new Date().setDate(new Date().getDate() + 25))
            }
        })
        accessToken = generateToken(user.user.id, user.user.email, user.user.role)
    }
    res.cookie("refreshToken", token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 25 * 24 * 60 * 60 * 1000
    });
    res.cookie("authToken", token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax'
    })
    res.redirect(req.query.state as string || "http://localhost:5173/home");
}

