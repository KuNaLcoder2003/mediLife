import { createClient } from "redis"

const newClient = () => createClient({ url: process.env.REDIS_URL ?? "redis://localhost:6379" })

let connecting: Promise<ReturnType<typeof newClient>> | null = null

// Created on first call (not at import) so each app's dotenv.config() has already run.
// Calling it again in the same process returns the same connected client instead of throwing.
export async function getRedisClient() {
    if (!connecting) {
        const client = newClient()
        client.on("error", (err) => console.error("Redis error", err))
        connecting = client.connect().then(() => {
            console.log('Connected to Redis')
            return client
        }).catch((err) => {
            connecting = null
            throw err
        })
    }
    return connecting
}
