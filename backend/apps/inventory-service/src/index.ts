import { prisma } from "@repo/db";
import { getRedisClient } from "@repo/redis";
type EventPayload = {
    eventType: string,
    eventId: string,
    payload: { orderId: string, userId: string, eventType: string, products: { productId: string, quantity: number }[] },
    aggregateId: string,
    aggregateType: string
}
const redisClient = await getRedisClient()

class ProductStockUpdateError extends Error {
    constructor(public product: { productId: string, quantity?: number, orderId: string, userId: string }) {
        super('Insufficient stock');
        this.name = 'InsufficientStockError';
    }
}



await redisClient.subscribe('INVENTORY_UPDATE', async (message) => {
    const subscribedData = JSON.parse(message) as EventPayload
    console.log(subscribedData)
    const { orderId, userId, products, eventType } = subscribedData.payload
    switch (eventType) {
        case "MOVE_INVENTORY":
            try {
                const results = await prisma.$transaction(async (tx) => {
                    // const claimed = await tx.order.updateMany({
                    //     where: { id: orderId, status: "CREATED" },
                    //     data: { status: "CONFIRMED" },
                    // })
                    // if (claimed.count === 0) {
                    //     console.log(`[inventory] order ${orderId} already processed, skipping`)
                    //     return
                    // }
                    for (const product of subscribedData.payload.products) {
                        console.log('Product is : ', product)
                        const res = await tx.products.updateMany({
                            where: {
                                id: product.productId,
                                quantity: {
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
                            throw new ProductStockUpdateError({ productId: product.productId, orderId: subscribedData.payload.orderId, userId: subscribedData.payload.userId })
                        }
                        await tx.orderdProducts.create({
                            data: {
                                orderId: subscribedData.payload.orderId,
                                productId: product.productId,
                                // add quantity as well later
                            }
                        })
                    }
                    await tx.events.create({
                        data: {
                            aggregateId: subscribedData.payload.orderId,
                            aggregateType: "ORDER",
                            eventType: "UPDATE_ORDER",
                            payload: { eventType: "CREATE_TRACKING", orderId: subscribedData.payload.orderId, userId: subscribedData.payload.userId, products: subscribedData.payload.products },
                            attempts: 0,
                            status: "PENDING"
                        }
                    })
                }, { maxWait: 7000, timeout: 12000 })
            } catch (error) {
                console.log(error)
                if (error instanceof ProductStockUpdateError) {
                    await prisma.$transaction(async (tx) => {
                        await tx.order.update({
                            where: {
                                id: error.product.orderId
                            },
                            data: {
                                status: "CANCELLED" // instead of cancelled do STOCK_FAILURE
                            }
                        })
                        await tx.payments.update({
                            where: {
                                orderId: error.product.orderId
                            },
                            data: {
                                status: "CANCELLED" // instead of cancelled do Refund
                            }
                        })
                    }, { maxWait: 5000, timeout: 10000 })
                    await prisma.events.create({
                        data: {
                            aggregateId: error.product.orderId,
                            aggregateType: "INVENTORY",
                            eventType: "STOCK_FAILURE",
                            payload: { event: "STOCK_FAILURE", data: { message: "Some of the products are not available", products: error.product.productId } },
                            status: "PENDING",
                            attempts: 0
                        }
                    })
                }

            }
            break;
        case "CANCEL_ORDER":
            try {
                await prisma.$transaction(async (tx) => {
                    for (const product of products) {
                        const res = await tx.products.updateMany({
                            where: {
                                id: product.productId
                            },
                            data: {
                                quantity: {
                                    increment: product.quantity
                                },
                                reservedQuantity: {
                                    decrement: product.quantity
                                }
                            }
                        })
                        if (res.count == 0) {
                            console.log('HERE IN INVENTOY SERVICE')
                            throw new ProductStockUpdateError({ productId: product.productId, orderId: subscribedData.payload.orderId, userId: subscribedData.payload.userId })
                        }
                        await tx.events.create({
                            data: {
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
                            }
                        })
                    }
                }, { maxWait: 5000, timeout: 10000 })
            } catch (error) {
                if (error instanceof ProductStockUpdateError) {
                    await prisma.$transaction(async (tx) => {
                        await tx.order.update({
                            where: {
                                id: error.product.orderId
                            },
                            data: {
                                status: "CANCELLED" // instead of cancelled do STOCK_FAILURE
                            }
                        })
                        await tx.payments.update({
                            where: {
                                orderId: error.product.orderId
                            },
                            data: {
                                status: "CANCELLED" // instead of cancelled do Refund
                            }
                        })
                    }, { maxWait: 5000, timeout: 10000 })
                    await prisma.events.create({
                        data: {
                            aggregateId: error.product.orderId,
                            aggregateType: "INVENTORY",
                            eventType: "STOCK_FAILURE",
                            payload: { event: "RESTOCK_FAILURE", data: { message: "Some of the products are not updated", products: error.product.productId } },
                            status: "PENDING",
                            attempts: 0
                        }
                    })
                }

            }
            break;
    }
})