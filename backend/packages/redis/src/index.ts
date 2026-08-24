import { createClient } from "redis"

const rediClient = createClient()
export async function getRedisClient() {
    await rediClient.connect()
    console.log('Connected to Redis')
    return rediClient
}
