import { prisma } from "@repo/db";
import { getRedisClient } from "@repo/redis";

const redisClient = await getRedisClient()

class ProductStockUpdateError extends Error {
    constructor(public product: { productId: string, quantity?: number, orderId: string, userId: string }) {
        super('Insufficient stock');
        this.name = 'InsufficientStockError';
    }
}

await redisClient.subscribe('INVENTORY_UPDATE', async (message) => {
    try {
        const subscribedData = JSON.parse(message) as { orderId: string, userId: string, productIds: string[] }
        console.log(subscribedData)
        const results = await prisma.$transaction(async (tx) => {
            for (const product of subscribedData.productIds) {
                const res = await tx.products.updateMany({
                    where: {
                        id: product,
                        quantity: {
                            gte: 100
                        },
                        reservedQuantity: {
                            gte: 1
                        }
                    },
                    data: {
                        quantity: {
                            decrement: 14
                        },
                        reservedQuantity: {
                            decrement: 14
                        }
                    }
                })
                if (res.count == 0) {
                    console.log('HERE IN INVENTOY SERVICE')
                    throw new ProductStockUpdateError({ productId: product, orderId: subscribedData.orderId, userId: subscribedData.userId })
                }
                await tx.orderdProducts.create({
                    data: {
                        orderId: subscribedData.orderId,
                        productId: product,
                        // add quantity as well later
                    }
                })
            }
        }, { maxWait: 7000, timeout: 12000 })
        console.log('PUSHING UPDATE ORDER EVENT FOR CREATING A TRACKING')
        await redisClient.publish("UPDATE_ORDER", JSON.stringify({ eventType: "CREATE_TRACKING", orderId: subscribedData.orderId, userId: subscribedData.userId, products: subscribedData.productIds }))
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
            await redisClient.publish("WEBSOKET_NOTIFY", JSON.stringify({ event: "STOCK_FAILURE", data: { message: "Some of the products are not available", products: error.product.productId } }))
        }

    }
})