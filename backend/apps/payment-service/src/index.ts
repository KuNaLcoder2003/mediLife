import Stripe from "stripe";
import dotenv from "dotenv"
import { getRedisClient } from "@repo/redis";
import type { EventPayload, SubscribedData } from "./types.js";
import { prisma } from "@repo/db";
dotenv.config()

const STRIPE_SECRET = `${process.env.STRIPE_SECRET_KEY}`
const stripe = new Stripe(STRIPE_SECRET)


const redisClient = await getRedisClient()

const getProducts = async (items: { productId: string, quantity: number }[]) => {
    const ids = items.map(item => item.productId)
    const products = await prisma.products.findMany({
        where: {
            id: {
                in: ids
            }
        },
        select: {
            id: true,
            productName: true,
            productDescription: true,
            images: {
                select: {
                    imageUrl: true
                }
            },
            price: true,
        },
    })

    let mergedArr = products.map((product, index) => {
        return {
            ...product,
            quantity: items[index]!.quantity
        }
    })

    let result = mergedArr.map(item => {
        return {
            price_data: {
                currency: "usd",
                product_data: {
                    name: item.productName,
                    description: item.productDescription,
                },
                unit_amount: item.price * 100,
            },
            quantity: item.quantity,
        }
    })
    return {
        line_items: result,
        ids: ids
    }
}

redisClient.subscribe("INVENTORY_RESERVED", async (mesage) => {
    const { payload } = JSON.parse(mesage) as EventPayload
    try {

        console.log('Subscribed data in Payment Service is : ', payload)
        const items = await getProducts(payload.products)
        const url = await stripe.checkout.sessions.create({
            mode: "payment",
            line_items: items.line_items,
            success_url: 'http://localhost:5173/success',
            cancel_url: 'http://localhost:5173/fail',
            metadata: {
                orderId: payload.orderId,
                userId: payload.userId,
                products: JSON.stringify(payload.products),
            }
        })
        if (url) {
            // send url to client via websocket
            const result = await prisma.$transaction(async (tx) => {
                const result = await tx.payments.create({
                    data: {
                        orderId: payload.orderId,
                        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
                        status: "PENDING",
                    }
                })

                await tx.events.create({
                    data: {
                        eventType: "PAYMENT_LINK_CREATED",
                        aggregateId: payload.orderId,
                        aggregateType: "PAYMENTS",
                        payload: { url: url.url, userId: payload.userId },
                        status: "PENDING",
                        attempts: 0
                    }
                })
                return result
            }, { maxWait: 5000, timeout: 10000 })

        }
    } catch (error) {
        console.log(error)
        await prisma.events.create({
            data: {
                eventType: "PAYMENT_LINK_ERROR",
                aggregateId: payload.orderId,
                aggregateType: "PAYMENTS",
                payload: payload,
                status: "PENDING",
                lastError: error instanceof Error ? error.message : "",
                attempts: 0
            }
        })
    }
})