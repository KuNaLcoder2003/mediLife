import { prisma } from "@repo/db";
import jwt from "jsonwebtoken"
const SECRET = `${process.env.JWT_SECRET}`
import type { UserDetails } from "../types/index.js";
import bcrypt from "bcrypt"


export const generateToken = (id: string, email: string, role: string) => {
    const token = jwt.sign({ id, email, role }, SECRET, { expiresIn: "15m" })
    return token
}
export const createUser = async (userDetails: UserDetails) => {
    let userObject = { ...userDetails }
    if (userDetails.password) {
        const hashedPassword = await bcrypt.hash(userDetails.password as string, 10)
        userDetails.password = hashedPassword
    }
    const newUser = await prisma.$transaction(async (tx) => {
        const user = await tx.users.create({
            data: userObject
        })
        return user
    }, { maxWait: 5000, timeout: 10000 })

    if (!newUser) {
        return false
    }
    return newUser
}

export const findUser = async (email: string, id: string) => {
    const user = await prisma.users.findFirst({
        where: {
            OR: [{ id: id }, { email: email }]
        }
    })
    if (!user) {
        return false
    }
    return user
}

export const getUserAuth = async (email: string, password: string) => {
    const user = await prisma.users.findFirst({
        where: {
            email: email
        }
    })
    if (!user) {
        return {
            valid: false,
            reason: "User does not exists , please try Signup",
            status: 404,
            user: null
        }
    }

    if (user.authMode == "CREDENTIALS") {
        const matched = bcrypt.compare(password, user.password as string)
        if (!matched) {
            return {
                valid: false,
                reason: "Invalid password",
                status: 401,
                user: null
            }
        }
    }
    return {
        valid: true,
        reason: "User found",
        status: 200,
        user
    }
}



export const addAddress = async () => {

}