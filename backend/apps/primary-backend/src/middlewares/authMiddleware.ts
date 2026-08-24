import express from "express"
import jwt from "jsonwebtoken"
import dotenv from "dotenv"

dotenv.config()
const JWT_SECRET = process.env.JWT_SECRET
async function authMiddleware(req: any, res: express.Response, next: express.NextFunction) {
    try {
        const authToken = req.headers.accessToken as string;
        if (!authToken || !authToken.startsWith("Bearer ")) {
            return res.status(403).json({
                message: "Unauthorized",
                valid: false
            })
        }

        const token = authToken.split('Bearer ').at(-1)
        if (!token) {
            return res.status(403).json({
                message: "Unauthorized",
                valid: false
            })
        }
        const verified = jwt.verify(token, JWT_SECRET || "kunal") as { email: string, id: string, role: "User" | "Company" }
        if (!verified) {
            return res.status(403).json({
                message: "Unauthorized",
                valid: false
            })
        }
        else {
            req.id = verified.id
            req.email = verified.email
            next()
        }
    } catch (error) {
        console.log(error)
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({
                message: 'Access Token expired',
                valid: false,
                code: "ACCESS_TOKEN_EXPIRED"
            })
            return
        }
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({
                message: 'Invalid access token',
                valid: false,
                code: "INVALID_ACCESS_TOKEN"
            })
            return
        }
        res.status(500).json({
            message: "Something went wrong",
            valid: false
        })
    }
}

export default authMiddleware