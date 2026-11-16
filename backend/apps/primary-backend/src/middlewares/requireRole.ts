import express from "express"

// Use after authMiddleware, which sets req.role from the access token
function requireRole(...roles: ("USER" | "COMPANY")[]) {
    return (req: any, res: express.Response, next: express.NextFunction) => {
        if (!req.role || !roles.includes(req.role)) {
            return res.status(403).json({
                message: "Forbidden",
                valid: false
            })
        }
        next()
    }
}

export default requireRole
