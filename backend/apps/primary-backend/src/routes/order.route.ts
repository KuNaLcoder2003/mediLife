import express from "express"
import { cancelOrderHandler, getAllOrdersAdmin, getOrderByIdController, getOrdersController, newOrder } from "../controllers/orders.controller.js"
import authMiddleware from "../middlewares/authMiddleware.js"

const ordersRouter = express.Router()

ordersRouter.post('/newOrder', authMiddleware, newOrder)
ordersRouter.post('/cancel', authMiddleware, cancelOrderHandler)
ordersRouter.post('/getOrders', authMiddleware, getOrdersController)
ordersRouter.post('/get/:orderId', authMiddleware, getOrderByIdController)
ordersRouter.get('/admin/allOrders', getAllOrdersAdmin)

export default ordersRouter