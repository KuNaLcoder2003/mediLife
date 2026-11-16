import express from "express"
import type { NewOrderPayload, Order } from "../types/index.js"
import { getRedisClient } from "@repo/redis"
import { getProductById } from "./products.controller.js"
import { createOrder, getOrderById, getUserOrder } from "../helpers/orders.js"
import { prisma } from "@repo/db"
const redisClient = await getRedisClient()

const CANCELLABLE_STATUSES: ("CREATED" | "CONFIRMED" | "PACKING")[] = ["CREATED", "CONFIRMED", "PACKING"]

export const newOrder = async (req: any, res: express.Response) => {
    try {
        // always the logged-in user from the token, never from the body
        const userId = req.id as string
        const incomingObject = req.body?.orderDetails as NewOrderPayload
        if (!incomingObject || !Array.isArray(incomingObject.products) || incomingObject.products.length === 0
            || typeof incomingObject.addressId !== "string" || !incomingObject.addressId) {
            res.status(400).json({
                message: 'Bad request, order details not recieved',
                valid: false
            })
            return
        }

        // quantities must be positive whole numbers; the same product twice is merged into one line
        const merged = new Map<string, number>()
        for (const item of incomingObject.products) {
            if (typeof item?.productId !== "string" || !item.productId || !Number.isInteger(item.quantity) || item.quantity <= 0) {
                res.status(400).json({
                    message: "Bad request, invalid product or quantity",
                    valid: false
                })
                return
            }
            merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity)
        }
        const products = [...merged].map(([productId, quantity]) => ({ productId, quantity }))

        // the delivery address must belong to this user
        const address = await prisma.address.findFirst({
            where: { id: incomingObject.addressId, userId: userId },
            select: { id: true }
        })
        if (!address) {
            res.status(400).json({
                message: "Please select a valid delivery address",
                valid: false
            })
            return
        }

        const results = await Promise.allSettled(products.map(async (product) => {
            const p = getProductById(product.productId)
            return p
        }))

        let notAvailable: string[] = []
        let total = 0;
        const items: { productId: string, quantity: number, priceAtPurchase: number }[] = []
        results.map((res, index) => {
            const item = products[index]!
            // missing, disabled, or not enough free (unreserved) stock
            if (res.status == "rejected" || !res.value || res.value.disabled
                || res.value.quantity - res.value.reservedQuantity < item.quantity) {
                notAvailable.push(item.productId)
            }
            else {
                // same price Stripe charges: discount is a percentage
                const unitPrice = Math.round(res.value.price * (1 - (res.value.discount ?? 0) / 100) * 100) / 100
                items.push({ ...item, priceAtPurchase: unitPrice })
                total += unitPrice * item.quantity
            }
        })
        total = Math.round(total * 100) / 100

        if (notAvailable.length > 0) {
            res.status(402).json({
                message: "Some of the products are not available",
                valid: false
            })
            return
        }
        const enrichedOrderObject: Order = {
            products: products,
            addressId: incomingObject.addressId,
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
        }, enrichedOrderObject, items)

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
            valid: false
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
        const orderId = req.body?.orderId
        if (!orderId || typeof orderId !== "string") {
            res.status(400).json({
                message: "Bad Request",
                valid: false
            })
            return
        }
        const existing = await prisma.order.findFirst({
            where: { id: orderId, userId: userId },
            select: { status: true }
        })
        if (!existing) {
            res.status(404).json({
                message: "No orders found",
                valid: false
            })
            return
        }
        // only before shipping (frontend2 lib/Order.ts CANCELLABLE_STATUSES must match)
        if (!(CANCELLABLE_STATUSES as string[]).includes(existing.status)) {
            res.status(400).json({
                message: "This order can no longer be cancelled",
                valid: false
            })
            return
        }
        // real quantities, saved when the order was placed
        const orderdProducts = await prisma.orderdProducts.findMany({
            where: {
                orderId: orderId
            },
            select: {
                productId: true,
                quantity: true
            }
        })
        const result = await prisma.$transaction(async (tx) => {
            // conditional update: a second cancel (or a status change in between) does nothing
            const updated = await tx.order.updateMany({
                where: {
                    id: orderId,
                    userId: userId,
                    status: { in: CANCELLABLE_STATUSES }
                },
                data: {
                    status: "CANCELLED"
                }
            })
            if (updated.count === 0) {
                return { order: null }
            }
            await tx.events.create({
                data: {
                    aggregateType: "ORDER",
                    aggregateId: orderId,
                    payload: {
                        userId: userId,
                        orderId: orderId,
                        status: "CANCELLED",
                        eventType: "CANCEL_ORDER",
                        products: orderdProducts
                    },
                    eventType: "INVENTORY_UPDATE",
                    status: "CREATED",
                    attempts: 0
                }
            })
            return { order: updated }
        }, { maxWait: 5000, timeout: 10000 })
        if (!result.order) {
            res.status(403).json({
                message: "Unable to process cancellation request at the moment",
                valid: false
            })
            return
        }
        res.status(200).json({
            message: "Cancellation processed",
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

export const getAllOrdersAdmin = async (req: express.Request, res: express.Response) => {
    try {
        const orders = await prisma.order.findMany({
            select: {
                id: true,
                orderTotal: true,
                userId: true,
                createdAt: true,
                trackingId: true,
                address: true,
                status: true,
                orderedProducts: {
                    select: {
                        quantity: true,
                        priceAtPurchase: true,
                        product: {
                            select: {
                                id: true,
                                productDescription: true,
                                productName: true,
                                images: true,
                            }
                        }
                    }
                }
            }
        })
        if (!orders) {
            res.status(404).json({
                message: "No order found",
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