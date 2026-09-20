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
    if (!event) {
        return false
    }
    const { id, eventType, aggregateId, aggregateType, payload } = event
    const res = await prisma.$transaction(async (tx) => {
        await tx.events.update({
            where: {
                id: id
            },
            data: {
                status: "DISPACTED",
                updataedAt: new Date()
            }
        })
        switch (aggregateType) {
            case "ORDER":
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

        }
    })
}