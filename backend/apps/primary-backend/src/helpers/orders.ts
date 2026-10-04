import { prisma } from "@repo/db"
import type { OrderPayLoad } from "../types/index.js"

export const createOrder = async (orderDetails: OrderPayLoad, eventPayload: object) => {
    const newOrder = await prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
            data: orderDetails
        })
        await tx.events.create({
            data: {
                eventType: "ORDER_CREATED",
                aggregateType: "ORDER",
                aggregateId: order.id,
                payload: {
                    ...eventPayload,
                    orderId: order.id
                },
                status: "PENDING",
                attempts: 0
            }
        })
        return order
    }, { maxWait: 5000, timeout: 10000 })

    if (!newOrder) {
        return false
    }
    return newOrder
}

export const getUserOrder = async (userId: string) => {
    try {
        if (!userId) {
            return false
        }
        const orders = await prisma.order.findMany({
            where: {
                userId: userId
            },
            select: {
                id: true,
                orderTotal: true,
                userId: true,
                createdAt: true,
                trackingId: true,
                address: true,
                orderedProducts: {
                    select: {
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
            return false
        }

        return orders;
    } catch (error) {
        console.log(error)
        return false
    }
}

export const getOrderById = async (orderId: string) => {
    const order = await prisma.order.findUnique({
        where: {
            id: orderId
        },
        select: {
            id: true,
            orderTotal: true,
            userId: true,
            createdAt: true,
            trackingId: true,
            address: true,
            orderedProducts: {
                select: {
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

    return order
}