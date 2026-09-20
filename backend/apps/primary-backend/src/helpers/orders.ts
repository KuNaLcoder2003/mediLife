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