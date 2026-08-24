import express from "express"
import type { NewOrderPayload, Order } from "../types/index.js"
import { getRedisClient } from "@repo/redis"
import { getProductById } from "./products.controller.js"
import { createOrder } from "../helpers/orders.js"
const redisClient = await getRedisClient()

export const newOrder = async (req: express.Request, res: express.Response) => {
    try {
        const userId = req.body.userId
        const incomingObject = req.body.orderDetails as NewOrderPayload
        if (!incomingObject) {
            res.status(400).json({
                message: 'Bad request, order details not recieved',
                valid: false
            })
            return
        }

        const results = await Promise.allSettled(incomingObject.products.map(async (product) => {
            const p = getProductById(product.productId)
            return p
        }))

        let notAvailable: string[] = []
        let total = 0;
        results.map((res, index) => {

            if (res.status == "rejected") {
                notAvailable.push(incomingObject.products[index]?.productId!)
            } else if (res.value?.quantity == 0) {
                notAvailable.push(incomingObject.products[index]?.productId!)
            }
            else if (res.status == "fulfilled") {
                total += res.value?.price! * incomingObject.products[index]?.quantity!
            }
        })

        if (notAvailable.length > 0) {
            res.status(402).json({
                message: "Some of the products are not available",
                valid: false
            })
            return
        }
        const enrichedOrderObject: Order = {
            ...incomingObject,
            userId: userId,
            trackingId: "",
            status: "CREATED",
            orderTotal: total,
        }

        // pass this to a queue => from the queue the order-service will pick this up

        // a prisma call => await prisma.orders.create({
        // data : enrichedOrderObject
        // })
        const newOrder = await createOrder({
            userId: userId,
            trackingId: "",
            status: "CREATED",
            orderTotal: total,
            addressId: incomingObject.addressId
        })

        if (!newOrder) {
            res.status(402).json({
                message: "Unable to create order at the moment",
                valid: false
            })
            return
        }
        redisClient.lPush("ORDERS", JSON.stringify({ ...enrichedOrderObject, orderId: newOrder.id }))
        res.status(200).json({
            message: "Processing your order , please wait",
            valid: true
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Something went wrong",
            vaalid: false
        })
    }
}