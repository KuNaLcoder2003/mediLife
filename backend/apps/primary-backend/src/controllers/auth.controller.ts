import express from "express"
import { prisma } from "@repo/db"
import { generateToken } from "../helpers/users.js"
import crypto from "crypto"
import { generateAuthUrl } from "../utility/google.js"
export const refreshHandler = async (req: express.Request, res: express.Response) => {
    try {
        const refreshToken = req.cookies.refreshToken
        if (!refreshToken) {
            res.status(401).json({
                message: "Invalid token",
                valid: false
            })
            return
        }
        const user = await prisma.session.findUnique({
            where: {
                tokenHash: refreshToken,
                expiresAt: {
                    gte: new Date()
                }
            },
            select: {
                id: true,
                tokenHash: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        role: true
                    }
                }
            }
        })
        if (!user) {
            res.status(401).json({
                message: "Session expired",
                valid: false
            })
            return
        }
        const token = generateToken(user.user.id, user.user.email, user.user.role)
        res.status(200).json({
            access_token: token,
            valid: true
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Something went wrong",
            valid: false
        })
    }
}

export const logout = async (req: express.Request, res: express.Response) => {
    try {
        const refreshToken = req.cookies.refreshToken as string
        const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex")
        await prisma.session.delete({
            where: {
                tokenHash: tokenHash
            }
        })
        res.clearCookie("refreshToken")
        res.status(200).json({
            message: "Logged out",
            valid: true
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Something went wrong"
        })
    }
}

export const authUsingGoogle = async (req: express.Request, res: express.Response) => {
    try {
        const url = await generateAuthUrl()
        if (!url) {
            res.status(400).json({
                message: 'Unale to create auth link',
                valid: false
            })
            return
        }
        res.status(200).json({
            url,
            valid: true
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Something went wrong",
            valid: false
        })
    }
} 
