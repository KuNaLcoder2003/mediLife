import express from "express"
import type { NewOrderPayload, Order } from "../types/index.js"
import { getRedisClient } from "@repo/redis"
import { getProductById } from "./products.controller.js"
import { createOrder, getOrderById, getUserOrder } from "../helpers/orders.js"
import { prisma } from "@repo/db"
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
        }, enrichedOrderObject)

        if (!newOrder) {
            res.status(402).json({
                message: "Unable to create order at the moment",
                valid: false
            })
            return
        }
        // redisClient.lPush("ORDERS", JSON.stringify({ ...enrichedOrderObject, orderId: newOrder.id }))
        res.status(200).json({
            message: "Processing your order , please wait",
            valid: true,
            orderId: newOrder.id,
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Something went wrong",
            vaalid: false
        })
    }
}

export const getOrdersController = async (req: any, res: express.Response) => {
    try {
        const userId = req.id
        if (!userId) {
            res.status(401).json({
                message: "Unauthorized",
                valid: false
            })
            return
        }
        const orders = await getUserOrder(userId)
        if (!orders) {
            res.status(404).json({
                message: "No orders found",
                valid: false
            })
            return
        }
        res.status(200).json({
            valid: true,
            orders
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Something went wrong",
            valid: false
        })
    }
}

export const getOrderByIdController = async (req: any, res: express.Response) => {
    try {
        const orderId = req.params.orderId
        if (!orderId) {
            res.status(400).json({
                message: "Bad request",
                valid: false
            })
            return
        }
        const order = await getOrderById(orderId)
        if (!order || order.userId !== req.id) {
            return res.status(404).json({ message: "No orders found", valid: false })
        }
        res.status(200).json({
            valid: true,
            order
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Something went wrong",
            valid: false
        })
    }
}

export const cancelOrderHandler = async (req: any, res: express.Response) => {
    try {
        const userId = req.id
        const orderId = req.body.orderId
        const products = req.body.products as { productId: string, quantity: number }[]
        if (!orderId) {
            res.status(400).json({
                message: "Bad Request",
                valid: false
            })
            return
        }
        const result = await prisma.$transaction(async (tx) => {
            const order = await tx.order.update({
                where: {
                    id: orderId
                },
                data: {
                    status: "CANCELLED"
                }
            })
            await tx.events.create({
                data: {
                    aggregateType: "ORDER",
                    aggregateId: orderId,
                    payload: {
                        userId: userId,
                        orderId: orderId,
                        status: "CANCELLED",
                        eventType: "CANCEL_ORDER",
                        products: products
                    },
                    eventType: "INVENTORY_UPDATE",
                    status: "CREATED",
                    attempts: 0
                }
            })
            return { order }
        }, { maxWait: 5000, timeout: 10000 })
        if (!result.order) {
            res.status(403).json({
                message: "Unable to process cancellation request at the moment",
                valid: false
            })
            return
        }
        res.status(200).json({
            message: "Cancellation proceesed",
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