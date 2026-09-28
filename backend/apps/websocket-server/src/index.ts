import express from "express"
import { WebSocket, WebSocketServer, type RawData } from "ws"
import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import { getRedisClient } from "@repo/redis"

dotenv.config()

// Must be the same secret generateToken signs with. Never hardcode it.
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error("JWT_SECRET is not set")

const PORT = Number(process.env.WS_PORT ?? 8080)
const ALLOWED_ORIGINS = (process.env.WS_ALLOWED_ORIGINS ?? "http://localhost:5173").split(",")
const AUTH_TIMEOUT_MS = 10_000
const HEARTBEAT_MS = 30_000

type EventPayload = {
    eventType: string
    eventId: string
    payload: any
    aggregateId: string   // assumed to be the orderId for order/payment events
    aggregateType: string
}

// Everything sent to the browser is JSON with a `type`, so the client can tell messages apart.
type OutgoingMessage =
    | { type: "AUTHENTICATED" }
    | { type: "UNAUTHENTICATED" }
    | { type: "ERROR"; message: string }
    | { type: "PAYMENT_LINK_CREATED"; orderId?: string; paymentUrl: string }
    | { type: "INVENTORY_UNAVAILABLE"; orderId?: string; message?: string; details?: unknown }

type Client = WebSocket & { userId?: string; isAlive?: boolean }

const app = express()
const server = app.listen(PORT, () => console.log(`[ws] listening on ${PORT}`))

const wss = new WebSocketServer({
    server,
    // Only accept browser connections from our own frontend
    verifyClient: ({ origin }: { origin: string }) => !origin || ALLOWED_ORIGINS.includes(origin),
})

// One user can have several tabs open, so keep a set of sockets per user.
const clients = new Map<string, Set<Client>>()

function addClient(userId: string, ws: Client) {
    let set = clients.get(userId)
    if (!set) clients.set(userId, (set = new Set()))
    set.add(ws)
}

function removeClient(ws: Client) {
    if (!ws.userId) return
    const set = clients.get(ws.userId)
    set?.delete(ws)
    if (set && set.size === 0) clients.delete(ws.userId)
}

function send(ws: WebSocket, message: OutgoingMessage) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message))
}

function notifyUser(userId: string, message: OutgoingMessage): number {
    const set = clients.get(userId)
    set?.forEach((ws) => send(ws, message))
    return set?.size ?? 0
}

wss.on("connection", (ws: Client) => {
    ws.isAlive = true
    ws.on("pong", () => {
        ws.isAlive = true
    })

    // Drop sockets that never authenticate
    const authTimer = setTimeout(() => {
        if (!ws.userId) ws.close(4001, "Authentication timeout")
    }, AUTH_TIMEOUT_MS)

    ws.on("message", (raw: RawData) => {
        // Bad input must never throw: an uncaught error here would crash the whole server
        let data: { type?: string; token?: unknown }
        try {
            data = JSON.parse(raw.toString())
        } catch {
            return send(ws, { type: "ERROR", message: "Invalid JSON" })
        }

        if (data.type === "Authentication") {
            try {
                const payload = jwt.verify(String(data.token), JWT_SECRET) as { id: string }
                if (ws.userId && ws.userId !== payload.id) removeClient(ws)
                ws.userId = payload.id
                addClient(payload.id, ws)
                clearTimeout(authTimer)
                send(ws, { type: "AUTHENTICATED" })
            } catch {
                // Expired or invalid token: the client refreshes and sends a new one
                send(ws, { type: "UNAUTHENTICATED" })
            }
        }
    })

    ws.on("close", () => {
        clearTimeout(authTimer)
        removeClient(ws)
    })

    ws.on("error", (err) => console.log("[ws] socket error:", err.message))
})

// Terminate connections that stopped answering pings (closed laptop, lost wifi)
const heartbeat = setInterval(() => {
    for (const ws of wss.clients as Set<Client>) {
        if (!ws.isAlive) {
            ws.terminate()
            continue
        }
        ws.isAlive = false
        ws.ping()
    }
}, HEARTBEAT_MS)
wss.on("close", () => clearInterval(heartbeat))

// A connection in subscribe mode can't run other commands, so use a dedicated one.
const redisClient = await getRedisClient()
const subscriber = redisClient.duplicate()
await subscriber.connect()

await subscriber.subscribe("WEBSOCKET_NOTIFY", (message: string) => {
    let event: EventPayload
    try {
        event = JSON.parse(message)
    } catch {
        console.log("[ws] ignoring malformed event:", message)
        return
    }

    const userId: string | undefined = event.payload?.userId
    if (!userId) {
        console.log("[ws] event without payload.userId:", event.eventType)
        return
    }

    let delivered = 0
    switch (event.eventType) {
        case "PAYMENT_LINK_CREATED":
            delivered = notifyUser(userId, {
                type: "PAYMENT_LINK_CREATED",
                orderId: event.aggregateId,
                paymentUrl: event.payload.url,
            })
            break
        case "INVENTORY_UNAVAILABLE":
            delivered = notifyUser(userId, {
                type: "INVENTORY_UNAVAILABLE",
                orderId: event.aggregateId,
                message: event.payload.message,
                details: event.payload.data,
            })
            break
        default:
            return
    }
    console.log(`[ws] ${event.eventType} for ${userId} -> ${delivered} socket(s)`)
})