import { prisma } from "@repo/db";
import { getRedisClient } from "@repo/redis";
import type { Order } from "./types.js";
import { checkAvailabilityAndReserve } from "./helper.js";
/**
 * -----------------------------FLOW----------------------------- : 
 * 1. Get the order object form QUEUE 
 * 2. Run availability check on it 
 * 3. If available , then add quantity to reserved quantity and decrement from qunatity
 * 4. If anyone fails => add to retry queue
 * 5. If DB connection is lost => then add to DB unavailable
 * 6. If reserve of all products succeeds then publish to InventoryReserved
 * 7. Repeat for every object in the queue
 */

const redisClient = await getRedisClient()
console.log('Connected to redis')




await redisClient.subscribe('UPDATE_ORDER', async (message) => {
    try {
        const subscribedData = JSON.parse(message) as { eventId: string, orderId: string, userId: string, eventType: string, productIds: string[] }
        console.log('ORDER UPDATE DATA IS : ', subscribedData)
        // update the order
        switch (subscribedData.eventType) {
            case "PAYMENT_CONFIRMED":
                await prisma.$transaction(async (tx) => {
                    const res = await tx.order.updateMany(
                        {
                            where: {
                                id: subscribedData.orderId
                            },
                            data: {
                                status: "CONFIRMED"
                            }
                        }
                    )
                    if (res.count > 1) {
                        await redisClient.publish("INVENTORY_UPDATE", JSON.stringify({ orderId: subscribedData.orderId, userId: subscribedData.userId, productIds: subscribedData.productIds }))
                    }

                }, { maxWait: 5000, timeout: 10000 })
                break;
            case "CREATE_TRACKING":

                break;
        }
    } catch (error) {
        console.log(error)
    }
})


async function pickOrders() {
    const objectFromQueue = await redisClient.brPop('ORDERS', 0)
    console.log('Object Recieved in Order Service : ', JSON.parse(objectFromQueue!.element))
    if (!objectFromQueue) {
        return
    }
    const order = JSON.parse(objectFromQueue.element) as Order
    const result = await checkAvailabilityAndReserve(order.products)

    switch (result.event) {
        case "INVENTORY_RESERVED":
            // PUBLISH TO INVENTORY_RESERVED => WHICH IS SUBSCRIBED BY THE PAYMENT SERVICE
            await redisClient.publish("INVENTORY_RESERVED", JSON.stringify({ orderId: order.orderId, userId: order.userId, products: order.products, total: order.orderTotal, eventId: `INVENTORY_RESERVED_${(new Date()).toDateString()}` }))
            break;
        case "INVENTORY_UNAVAILABLE":
            // PUBLISH TO INVENTORY_UNAVAILABLE => WHICH IS SUBSCRIBED BY THE WEBSOCKET THAT SENDS THE CLIENT THIS INFO
            await redisClient.publish("WEBSOCKET_NOTIFY", JSON.stringify({ event: "INVENTORY_UNAVAILABLE", data: { userId: order.userId, productId: result.productId } }))
            break
        case "DATABASE_CONNECTION_ERROR":
            // PUSH TO RETRY INVENTORY_QUEUE
            await redisClient.lPush("ORDERS", JSON.stringify(order))
            break
    }
}

while (true) {
    await pickOrders()
}