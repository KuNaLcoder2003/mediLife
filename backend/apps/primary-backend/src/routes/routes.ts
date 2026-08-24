import express from "express"
import usersRouter from "./users.route.js"
import authRouter from "./auth.routes.js"
import ordersRouter from "./order.route.js"

const router = express.Router()
router.use('/users', usersRouter)
router.use('/auth', authRouter)
router.use('/order', ordersRouter)

export default router