import express from "express"
import { WebSocket, WebSocketServer, type RawData } from 'ws'
import jwt from "jsonwebtoken"
import { getRedisClient } from "@repo/redis"
const app = express()
const server = app.listen(8080)

const wss = new WebSocketServer({ server: server })
const clients = new Map<string, WebSocket>()
const redisClient = await getRedisClient()

type EventPayload = {
    eventType: string,
    eventId: string,
    payload: any,
    aggregateId: string,
    aggregateType: string
}


wss.on('connection', async (ws, req) => {
    ws.on('message', (message: RawData) => {
        const data = JSON.parse(message.toString())
        console.log(data)
        if (data.type == "Authentication") {
            const token = data.token
            const verified = jwt.verify(token, '(*)903rioierkmqwjkednjs') as { email: string, id: string, role: string }
            if (!verified) {
                console.log('Not verified')
                ws.send("Unauthenticated")
            } else {
                console.log('Verified')
                if (ws.readyState == WebSocket.OPEN) {
                    clients.set(verified.id, ws)
                    console.log(clients)
                } else {
                    return
                }
            }
        }
    })
    ws.send("Connected to ws server")
})

await redisClient.subscribe("WEBSOCKET_NOTIFY", async (message) => {
    console.log(message)
    const data = JSON.parse(message) as EventPayload
    const client = clients.get(data.payload.userId)
    console.log(clients)
    switch (data.eventType) {
        case "PAYMENT_LINK_CREATED":
            if (client && client.readyState == WebSocket.OPEN) {
                client.send(JSON.stringify({ paymentUrl: data.payload.url }))
            }
            break;
        case "INVENTORY_UNAVAILABLE":
            if (client && client.readyState == WebSocket.OPEN) {
                client.send(JSON.stringify(data.payload.data))
            }
            break;
    }
})

