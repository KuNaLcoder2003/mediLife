import { prisma } from "@repo/db"
import type { OrderPayLoad } from "../types/index.js"

export const createOrder = async (orderDetails: OrderPayLoad) => {
    const newOrder = await prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
            data: orderDetails
        })
        return order
    }, { maxWait: 5000, timeout: 10000 })

    if (!newOrder) {
        return false
    }
    return newOrder
}