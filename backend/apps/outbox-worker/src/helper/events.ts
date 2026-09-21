import { prisma } from "@repo/db";
import { getRedisClient } from "@repo/redis";
const redisClient = await getRedisClient()

export type Event = {
    id: string,
    eventType: string,
    aggregateType: string,
    aggregateId: string,
    payload: any,
    status: string,
    createdAt: Date,
    updataedAt: Date,
    attempts: number,
    lastError: string | null
}

export const getOutboxevents = async () => {
    const events = await prisma.events.findMany({
        where: {
            status: "PENDING"
        },
        take: 50,
        orderBy: {
            createdAt: "asc"
        }
    })
    return events
}


export const processEvents = async (event: Event) => {
    console.log(event)
    if (!event) {
        return false
    }
    const { id, eventType, aggregateId, aggregateType, payload } = event

    console.log(event)

    try {
        switch (eventType) {
            case "ORDER_CREATED":
                console.log('HERE')
                if (eventType == "ORDER_CREATED") {
                    await redisClient.lPush(eventType, JSON.stringify({
                        eventType,
                        eventId: id,
                        payload: payload,
                        aggregateId,
                        aggregateType
                    }))
                }
                break;

            case "PAYMENT":
                break;

            case "INVENTORY_RESERVED":
                await redisClient.publish(eventType, JSON.stringify({
                    eventType,
                    eventId: id,
                    payload: payload,
                    aggregateId,
                    aggregateType
                }))
                break;

            case "INVENTORY_UNAVAILABLE":
                await redisClient.publish("WEBSOCKET_NOTIFY", JSON.stringify({
                    eventType,
                    eventId: id,
                    payload: payload,
                    aggregateId,
                    aggregateType
                }))
                break;

            case "INVENTORY_UPDATE":
                await redisClient.publish(eventType, JSON.stringify({
                    eventType,
                    eventId: id,
                    payload: payload,
                    aggregateId,
                    aggregateType
                }))
                break;

            case "STOCK_FAILURE":
                await redisClient.publish("WEBSOCKET_NOTIFY", JSON.stringify({
                    eventType,
                    eventId: id,
                    payload: payload,
                    aggregateId,
                    aggregateType
                }))
                break;

            case "PAYMENT_LINK_CREATED":
                await redisClient.publish("WEBSOCKET_NOTIFY", JSON.stringify({
                    eventType,
                    eventId: id,
                    payload: payload,
                    aggregateId,
                    aggregateType
                }))
                break;

            case "PAYMENT_LINK_ERROR":
                await redisClient.publish("WEBSOCKET_NOTIFY", JSON.stringify({
                    eventType,
                    eventId: id,
                    payload: payload,
                    aggregateId,
                    aggregateType
                }))
                break;

            case "UPDATE_ORDER":
                await redisClient.publish("UPDATE_ORDER", JSON.stringify({
                    eventType,
                    eventId: id,
                    payload: payload,
                    aggregateId,
                    aggregateType
                }))
                break;

            default:
                throw new Error(`Unknown event type: ${eventType}`)

        }

        await prisma.events.update({
            where: {
                id: id
            },
            data: {
                status: "PUBLISHED",
                updataedAt: new Date()
            }
        })

        return true

    } catch (error) {

        console.log('Error is :  ', error)
        await prisma.events.update({
            where: {
                id: id
            },
            data: {
                lastError: error instanceof Error ? error.message : String(error),
                attempts: {
                    increment: 1
                }
            }
        })

        return false
    }

}