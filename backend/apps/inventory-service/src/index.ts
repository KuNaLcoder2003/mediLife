import { prisma } from "@repo/db";
import { getRedisClient } from "@repo/redis";
type EventPayload = {
    eventType: string,
    eventId: string,
    payload: { orderId: string, userId: string, eventType: string, products: { productId: string, quantity: number }[] },
    aggregateId: string,
    aggregateType: string
}
type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
type Items = { productId: string, quantity: number }[]
const redisClient = await getRedisClient()

class ProductStockUpdateError extends Error {
    constructor(public product: { productId: string, quantity?: number, orderId: string, userId: string }) {
        super('Insufficient stock');
        this.name = 'InsufficientStockError';
    }
}

// RESERVED -> RELEASED: give back stock that was held for an unpaid order
const releaseReservation = async (tx: Tx, orderId: string, products: Items) => {
    const claimed = await tx.order.updateMany({
        where: { id: orderId, inventoryStatus: "RESERVED" },
        data: { inventoryStatus: "RELEASED" }
    })
    if (claimed.count === 0) return false
    for (const product of products) {
        await tx.products.updateMany({
            where: { id: product.productId, reservedQuantity: { gte: product.quantity } },
            data: { reservedQuantity: { decrement: product.quantity } }
        })
    }
    return true
}

// DEDUCTED -> RELEASED: put stock back for a paid order that was cancelled
const restock = async (tx: Tx, orderId: string, products: Items) => {
    const claimed = await tx.order.updateMany({
        where: { id: orderId, inventoryStatus: "DEDUCTED" },
        data: { inventoryStatus: "RELEASED" }
    })
    if (claimed.count === 0) return false
    for (const product of products) {
        await tx.products.updateMany({
            where: { id: product.productId },
            data: { quantity: { increment: product.quantity } }
        })
    }
    return true
}

const refundEvent = (orderId: string, userId: string, products: Items) => ({
    eventType: "INITIATE_REFUND",
    aggregateId: orderId,
    aggregateType: "PAYMENTS",
    payload: {
        orderId: orderId,
        userId: userId,
        products: products,
    },
    status: "CREATED",
    attempts: 0
})


await redisClient.subscribe('INVENTORY_UPDATE', async (message) => {
    let subscribedData: EventPayload
    try {
        subscribedData = JSON.parse(message) as EventPayload
    } catch {
        console.log('Ignoring malformed message: ', message)
        return
    }
    console.log(subscribedData)
    const { orderId, userId, products, eventType } = subscribedData.payload
    switch (eventType) {
        case "MOVE_INVENTORY":
            try {
                await prisma.$transaction(async (tx) => {
                    // claim: only a confirmed order whose stock is still reserved (skips repeats and cancelled orders)
                    const claimed = await tx.order.updateMany({
                        where: { id: orderId, status: "CONFIRMED", inventoryStatus: "RESERVED" },
                        data: { inventoryStatus: "DEDUCTED" },
                    })
                    if (claimed.count === 0) {
                        console.log(`[inventory] order ${orderId} already processed or cancelled, skipping`)
                        return
                    }
                    for (const product of products) {
                        console.log('Product is : ', product)
                        const res = await tx.products.updateMany({
                            where: {
                                id: product.productId,
                                quantity: {
                                    gte: product.quantity
                                },
                                reservedQuantity: {
                                    gte: product.quantity
                                },
                            },
                            data: {
                                quantity: {
                                    decrement: product.quantity
                                },
                                reservedQuantity: {
                                    decrement: product.quantity
                                }
                            }
                        })
                        if (res.count == 0) {
                            console.log('HERE IN INVENTOY SERVICE')
                            throw new ProductStockUpdateError({ productId: product.productId, orderId: orderId, userId: userId })
                        }
                    }
                    // order lines are saved when the order is placed; this only fills in orders placed before that change
                    await tx.orderdProducts.createMany({
                        data: products.map((product) => ({ orderId: orderId, productId: product.productId, quantity: product.quantity })),
                        skipDuplicates: true
                    })
                    await tx.events.create({
                        data: {
                            aggregateId: orderId,
                            aggregateType: "ORDER",
                            eventType: "UPDATE_ORDER",
                            payload: { eventType: "CREATE_TRACKING", orderId: orderId, userId: userId, products: products },
                            attempts: 0,
                            status: "PENDING"
                        }
                    })
                }, { maxWait: 7000, timeout: 12000 })
            } catch (error) {
                console.log(error)
                if (error instanceof ProductStockUpdateError) {
                    // paid but stock can't be deducted: cancel, free the reservation and refund the customer
                    await prisma.$transaction(async (tx) => {
                        const cancelled = await tx.order.updateMany({
                            where: { id: orderId, status: "CONFIRMED" },
                            data: { status: "CANCELLED" }
                        })
                        if (cancelled.count === 0) return
                        await releaseReservation(tx, orderId, products)
                        await tx.events.create({ data: refundEvent(orderId, userId, products) })
                        await tx.events.create({
                            data: {
                                aggregateId: orderId,
                                aggregateType: "INVENTORY",
                                eventType: "STOCK_FAILURE",
                                payload: { event: "STOCK_FAILURE", userId: userId, orderId: orderId, message: "Some of the products are not available, your payment will be refunded", data: { message: "Some of the products are not available", products: error.product.productId } },
                                status: "PENDING",
                                attempts: 0
                            }
                        })
                    }, { maxWait: 5000, timeout: 10000 })
                }

            }
            break;
        case "CANCEL_ORDER":
            try {
                await prisma.$transaction(async (tx) => {
                    // unpaid: free the reservation. paid: put the stock back. Already released: nothing.
                    const released = await releaseReservation(tx, orderId, products)
                    if (!released) {
                        await restock(tx, orderId, products)
                    }
                    // one event per order: payment-service refunds a completed payment or closes a pending one
                    await tx.events.create({ data: refundEvent(orderId, userId, products) })
                }, { maxWait: 5000, timeout: 10000 })
            } catch (error) {
                console.log(error)
            }
            break;
        case "RELEASE_RESERVATION":
            // payment expired / failed / could not be created
            try {
                await prisma.$transaction(async (tx) => {
                    await releaseReservation(tx, orderId, products)
                }, { maxWait: 5000, timeout: 10000 })
            } catch (error) {
                console.log(error)
            }
            break;
    }
})
