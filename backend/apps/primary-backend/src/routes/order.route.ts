import express from "express"
import { cancelOrderHandler, getOrderByIdController, getOrdersController, newOrder } from "../controllers/orders.controller.js"
import authMiddleware from "../middlewares/authMiddleware.js"

const ordersRouter = express.Router()

ordersRouter.post('/newOrder', newOrder)
ordersRouter.post('/cancel', authMiddleware, cancelOrderHandler)
ordersRouter.post('/getOrders', authMiddleware, getOrdersController)
ordersRouter.post('/get/:orderId', authMiddleware, getOrderByIdController)

export default ordersRouter