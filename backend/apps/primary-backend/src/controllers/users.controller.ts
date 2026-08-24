import express from "express"
import { prisma } from "@repo/db"
import type { UserDetails } from "../types/index.js"
import { createUser, generateToken, getUserAuth } from "../helpers/users.js"
import crypto from "crypto"

export const getUserDetails = async (req: any, res: express.Response) => {
    try {
        const id = req.id
        const user = await prisma.users.findUnique({
            where: {
                id: id
            },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                gender: true,
                age: true,
                addresses: true
            }
        })

        if (!user) {
            res.status(400).json({
                message: "Unable to find user",
                valid: false
            })
            return
        }
        res.status(200).json({
            user,
            valid: true
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Somethig went wrong",
            valid: false
        })
    }
}

export const signUp = async (req: express.Request, res: express.Response) => {
    try {
        const userDetails = req.body.userDetails as UserDetails
        if (!userDetails) {
            res.status(400).json({
                message: "Bad request",
                valid: false
            })
            return
        }
        const userExists = await prisma.users.findFirst({
            where: {
                email: userDetails.email
            }
        })

        if (userExists) {
            res.status(400).json({
                message: "User already exists , please try logging in",
                valid: false
            })
            return
        }
        const newUser = await createUser(userDetails)

        if (!newUser) {
            res.status(403).json({
                message: "Unable to create account at the moment",
                valid: false
            })
            return
        }
        const refreshToken = crypto.hash("sha256", `${newUser.id}_${newUser.name}_${new Date().toString()}`)
        const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex")
        const session = await prisma.$transaction(async (tx) => {
            const entry = await tx.session.create({
                data: {
                    userId: newUser.id,
                    tokenHash: tokenHash,
                    expiresAt: new Date(new Date().setDate(new Date().getDate() + 25))
                }
            })
            return entry
        }, { maxWait: 5000, timeout: 10000 })
        if (!session) {
            res.status(302).json({
                message: "Account created , try logging in",
                valid: false
            })
            return
        }
        const accessToken = generateToken(newUser.id, newUser.email, newUser.role)
        res.cookie("refreshToken", `${refreshToken}`, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 25 * 24 * 60 * 60 * 1000
        })
        res.status(200).json({
            message: "Account created Succesfully",
            valid: true,
            accessToken: accessToken
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Something went wrong",
            valid: false
        })
    }
}

export const signIn = async (req: express.Request, res: express.Response) => {
    try {
        const userCredentials = req.body as { email: string, password: string }
        if (!userCredentials) {
            res.status(400).json({
                message: "Bad request",
                valid: false
            })
            return
        }
        const user = await getUserAuth(userCredentials.email, userCredentials.password)
        if (user.user == null || !user || !user.valid) {
            res.status(404).json({
                message: "User not found, please signup",
                valid: false
            })
            return
        }
        const refreshToken = crypto.hash("sha256", `${user.user.id}_${user.user.name}_${new Date().toString()}`)
        const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex")
        const session = await prisma.$transaction(async (tx) => {
            const entry = await tx.session.create({
                data: {
                    tokenHash: tokenHash,
                    userId: user.user.id,
                    expiresAt: new Date(new Date().setDate(new Date().getDate() + 25))
                }
            })
            return entry
        }, { maxWait: 5000, timeout: 10000 })

        if (!session) {
            res.status(402).json({
                message: "Unable to create a login session, please try later",
                valid: false
            })
            return
        }

        const accessToken = generateToken(user.user.id, user.user.email, user.user.role)
        res.cookie("refreshToken", `${refreshToken}`, {
            httpOnly: true,
            sameSite: "lax",
            secure: true,
            maxAge: 25 * 24 * 60 * 60 * 1000
        })
        res.status(200).json({
            message: "Signed In!",
            valid: true,
            accessToken: accessToken
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Something went wrong",
            valid: false
        })
    }
}

export const addAddressHandler = async (req: any, res: express.Response) => {
    try {
        const userId = req.id;
        const address = req.body

        const newAddress = await prisma.$transaction(async (tx) => {

        })
    } catch (error) {
        res.status(500).json({
            message: "Something went wrong",
            valid: false
        })
        return
    }
}
