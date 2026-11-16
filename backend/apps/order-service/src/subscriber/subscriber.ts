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
        switch (subscribedData.payload.eventType) {
            case "PAYMENT_CONFIRMED":
                await prisma.$transaction(async (tx) => {
                    // only a placed order moves to CONFIRMED (a repeated webhook or a cancelled order does nothing)
                    const res = await tx.order.updateMany(
                        {
                            where: {
                                id: subscribedData.payload.orderId,
                                status: "CREATED"
                            },
                            data: {
                                status: "CONFIRMED"
                            }
                        }
                    )
                    if (res.count == 1) {
                        await tx.events.create({
                            data: {
                                aggregateId: subscribedData.payload.orderId,
                                aggregateType: "INVENTORY",
                                eventType: "INVENTORY_UPDATE",
                                status: "PENDING",
                                attempts: 0,
                                payload: { orderId: subscribedData.payload.orderId, userId: subscribedData.payload.userId, products: subscribedData.payload.products, eventType: "MOVE_INVENTORY" }
                            }
                        })
                        return
                    }
                    // paid, but the order was cancelled meanwhile: give the money back
                    const order = await tx.order.findUnique({
                        where: { id: subscribedData.payload.orderId },
                        select: { status: true }
                    })
                    if (order?.status === "CANCELLED") {
                        await tx.events.create({
                            data: {
                                eventType: "INITIATE_REFUND",
                                aggregateId: subscribedData.payload.orderId,
                                aggregateType: "PAYMENTS",
                                payload: {
                                    orderId: subscribedData.payload.orderId,
                                    userId: subscribedData.payload.userId,
                                    products: subscribedData.payload.products,
                                },
                                status: "CREATED",
                                attempts: 0
                            }
                        })
                    }
                }, { maxWait: 5000, timeout: 10000 })
                break;
            case "CREATE_TRACKING":
                await prisma.$transaction(async (tx) => {
                    const res = await tx.order.updateMany({
                        where: {
                            id: subscribedData.payload.orderId,
                            status: "CONFIRMED"
                        },
                        data: {
                            status: "PACKING"
                        }
                    })
                    if (res.count === 0) {
                        return
                    }
                    const user = await tx.users.findUnique({
                        where: { id: subscribedData.payload.userId },
                        select: { email: true }
                    })
                    await tx.events.create({
                        data: {
                            eventType: "MAIL_USER",
                            payload: {
                                orderId: subscribedData.payload.orderId,
                                userId: subscribedData.payload.userId,
                                products: subscribedData.payload.products,
                                eventType: "ORDER_CONFIRM_MAIL",
                                userEmail: user?.email ?? ""
                            },
                            aggregateId: subscribedData.payload.orderId,
                            aggregateType: "ORDER_MAIL",
                            attempts: 0,
                            status: "CREATED"
                        }
                    })
                }, { maxWait: 5000, timeout: 10000 })
                break;
        }
    } catch (error) {
        console.log(error)
    }
})
