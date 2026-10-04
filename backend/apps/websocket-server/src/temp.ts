import { getRedisClient } from "@repo/redis";
import { WebSocket, WebSocketServer, type RawData } from "ws"
import express from "express"
import jwt from "jsonwebtoken"
import dotenv from "dotenv"



// setting the type for a client 
type Client = WebSocket & { userId: string, isAlive: boolean }

const ALLOWED_ORIGINS = "http://localhost:5173"

type outGoingMessage = { type: "UNAUTHENTICATED" }
    | { type: "AUTHENTICATED" } | { type: "ERROR"; message: string }
    | { type: "PAYMENT_LINK_CREATED"; orderId?: string; paymentUrl: string }
    | { type: "INVENTORY_UNAVAILABLE"; orderId?: string; message?: string; details?: unknown }


const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error("JWT_SECRET is not set")


// setting up the http server
const app = express()
const server = app.listen(8080)



const wss = new WebSocketServer({
    server: server,
    verifyClient: ({ origin }: { origin: string }) => !origin || ALLOWED_ORIGINS
})

// now setting up a map to track users

const map = new Map<string, Set<Client>>()
// this Set<Client> is done to make sure , that user when has opened multiple tabs of application , we must notify to every tab
// it's like => {
// "abc123" => {ws1 , ws2} , 
// "abc234" => {ws11 , ws34}
// }

function addClient(ws: Client) {
    // let's first check if the set of this ws client exists ot not
    let set = map.get(ws.userId)

    if (!set) {
        // if the set doesnot exists , that means its a new client , so we create a new set
        map.set(ws.userId, (set = new Set()))
    }
    // adding the `ws` client to the set
    set.add(ws)
}

function removeClinet(ws: Client) {
    // let's first get the set
    const set = map.get(ws.userId)
    set?.delete(ws)
    // now after deleting if the length of set is 0 , then it means the client has active session connected
    // so we remove the client from the map
    if (set && set.size == 0) {
        map.delete(ws.userId)
    }
}

function sendMessage(ws: Client, message: outGoingMessage) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message))
    }
}

// a function to send the message to all opened connection of client
function notifyUser(userId: string, message: outGoingMessage) {
    const set = map.get(userId)
    if (!set) {
        return 0
    }
    set.forEach((client) => {
        sendMessage(client, message)
    })
    return set?.size ?? 0
}

const heartbeat = setInterval(() => {
    for (let ws of wss.clients as Set<Client>) {
        if (!ws.isAlive) {
            ws.terminate()
            continue
        }
        ws.isAlive = false
        ws.ping()
    }
}, 10000);

wss.on("close", () => clearInterval(heartbeat))

wss.on("connection", (ws: Client) => {
    ws.isAlive = true
    ws.on("pong", () => {
        ws.isAlive = true
    })

    const authTimer = setTimeout(() => {
        // if we dont find the userId attached to the client , in the span of lets say 10 seconds , we forcefully close the connection 
        // as ws.close()
        if (ws.userId) {
            ws.close(4001, "Authentication timeout")
        }
    }, 10000)

    ws.on("message", (message: RawData) => {
        let data: { type?: string; token?: unknown }
        try {
            data = JSON.parse(message.toString())
        } catch (error) {
            return sendMessage(ws, { type: "ERROR", message: "Invalid JSON" })
        }
        if (data.type == "Authentication") {
            try {
                const verified = jwt.verify(data.token as string, JWT_SECRET) as { id: string }
                if (ws.userId && ws.userId !== verified.id) {
                    removeClinet(ws)
                }
                ws.userId = verified.id
                addClient(ws)
                sendMessage(ws, { type: "AUTHENTICATED" })
                clearTimeout(authTimer)
            } catch (error) {
                sendMessage(ws, { type: "UNAUTHENTICATED" })
            }
        }
    })

    // this is a event listerner to the event of a client closing the connection (it may be the client closing it or
    // we closing it forcefully via server as above `ws.close()`)
    ws.on("close", () => {
        clearTimeout(authTimer)
        ws.isAlive = false
    })
    ws.on("error", (err) => console.log("[ws] socket error:", err.message))
})





