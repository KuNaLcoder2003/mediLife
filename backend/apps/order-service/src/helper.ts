import { prisma } from "@repo/db";
import type { Product } from "./types.js";



class InsufficientStockError extends Error {
    constructor(public product: { productId: string, quantity: number }) {
        super('Insufficient stock');
        this.name = 'InsufficientStockError';
    }
}

export const getProductById = async (id: string) => {
    const product = prisma.products.findUnique({
        where: {
            id: id
        }
    })

    return product
}

export const checkAvailabilityAndReserve = async (items: { productId: string, quantity: number }[], orderId: string, userId: string, total: number) => {
    try {
        const reserved = await prisma.$transaction(async (tx) => {
            // claim the order: only a still-placed order with nothing reserved yet. This also locks the
            // order row, so a cancel running at the same time waits for us (and then sees RESERVED).
            const claimed = await tx.order.updateMany({
                where: { id: orderId, status: "CREATED", inventoryStatus: "NONE" },
                data: { inventoryStatus: "RESERVED" }
            })
            if (claimed.count === 0) {
                console.log(`[order-service] order ${orderId} already reserved or no longer open, skipping`)
                return false
            }
            for (let item of items) {
                // only stock that isn't already reserved by other orders can be reserved
                const count = await tx.$executeRaw`
                    UPDATE "Products"
                    SET "reservedQuantity" = "reservedQuantity" + ${item.quantity}, "updatedAt" = NOW()
                    WHERE "id" = ${item.productId} AND "disabled" = false
                      AND "quantity" - "reservedQuantity" >= ${item.quantity}`
                if (count === 0) {
                    throw new InsufficientStockError(item)
                }
            }
            await tx.events.create({
                data: {
                    aggregateType: "INVENTORY",
                    aggregateId: orderId,
                    eventType: "INVENTORY_RESERVED",
                    lastError: "",
                    status: "PENDING",
                    attempts: 0,
                    payload: { userId: userId, orderId: orderId, products: items }
                }
            })
            return true
        }, { maxWait: 10000, timeout: 10000 })
        return reserved
    } catch (error) {
        console.log(error)
        if (error instanceof InsufficientStockError) {
            console.log('Insufficient stock:', error.product.productId);
            // nothing was reserved (the transaction rolled back), so just close the order and tell the user
            await prisma.$transaction(async (tx) => {
                await tx.order.updateMany({
                    where: { id: orderId, status: "CREATED" },
                    data: { status: "CANCELLED" }
                })
                await tx.events.create({
                    data: {
                        aggregateType: "INVENTORY",
                        aggregateId: orderId,
                        eventType: "INVENTORY_UNAVAILABLE",
                        lastError: error.message,
                        status: "PENDING",
                        attempts: 0,
                        payload: {
                            productId: error.product.productId,
                            orderId: orderId,
                            userId: userId,
                            message: "Some items went out of stock while we confirmed your order. Update your bag and try again.",
                            data: { productId: error.product.productId }
                        }
                    }
                })
            }, { maxWait: 5000, timeout: 10000 })
            return false
        } else {
            // DB connection error
            return {
                event: "DATABASE_CONNECTION_ERROR"
            }
        }
    }
}
