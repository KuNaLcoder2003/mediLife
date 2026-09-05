import { getRedisClient } from "@repo/redis";
import { prisma } from "@repo/db";

const duplicte = await getRedisClient()
console.log('Duplicated')
await duplicte.subscribe('UPDATE_ORDER', async (message) => {
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
                    if (res.count == 1) {
                        console.log('HERE')
                        await duplicte.publish("INVENTORY_UPDATE", JSON.stringify({ orderId: subscribedData.orderId, userId: subscribedData.userId, productIds: subscribedData.productIds }))
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