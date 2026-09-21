import { getRedisClient } from "@repo/redis";
import { prisma } from "@repo/db";
type EventPayload = {
    eventType: string,
    eventId: string,
    payload: { orderId: string, userId: string, eventType: string, products: { productId: string, quantity: number }[] },
    aggregateId: string,
    aggregateType: string
}
const duplicte = await getRedisClient()
console.log('Duplicated')


await duplicte.subscribe('UPDATE_ORDER', async (message) => {
    try {
        const subscribedData = JSON.parse(message) as EventPayload
        console.log('ORDER UPDATE DATA IS : ', subscribedData)
        // update the order
        switch (subscribedData.eventType) {
            case "PAYMENT_CONFIRMED":
                await prisma.$transaction(async (tx) => {
                    const res = await tx.order.updateMany(
                        {
                            where: {
                                id: subscribedData.payload.orderId
                            },
                            data: {
                                status: "CONFIRMED"
                            }
                        }
                    )
                    if (res.count == 1) {
                        console.log('HERE')
                        await tx.events.create({
                            data: {
                                aggregateId: subscribedData.payload.orderId,
                                aggregateType: "INVENTORY",
                                eventType: "INVENTORY_UPDATE",
                                status: "PENDING",
                                attempts: 0,
                                payload: { orderId: subscribedData.payload.orderId, userId: subscribedData.payload.userId, products: subscribedData.payload.products }
                            }
                        })
                    }

                }, { maxWait: 5000, timeout: 10000 })
                break;
            case "CREATE_TRACKING":
                await prisma.$transaction(async (tx) => {
                    await tx.order.update({
                        where: {
                            id: subscribedData.payload.orderId,
                            status: "CONFIRMED"
                        },
                        data: {
                            status: "PACKING"
                        }
                    })
                })
                break;
        }
    } catch (error) {
        console.log(error)
    }
})