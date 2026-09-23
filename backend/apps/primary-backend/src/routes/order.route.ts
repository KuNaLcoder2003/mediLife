import express from "express"
import { newOrder } from "../controllers/orders.controller.js"

const ordersRouter = express.Router()

ordersRouter.post('/newOrder', newOrder)
ordersRouter.post('/cancel')

export default ordersRouter