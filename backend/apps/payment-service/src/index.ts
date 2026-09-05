import Stripe from "stripe";
import dotenv from "dotenv"
import { getRedisClient } from "@repo/redis";
import type { SubscribedData } from "./types.js";
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
        }
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
    try {
        const subscribedData = JSON.parse(mesage) as SubscribedData
        console.log('Subscribed data in Payment Service is : ', subscribedData)
        const items = await getProducts(subscribedData.products)
        const url = await stripe.checkout.sessions.create({
            mode: "payment",
            line_items: items.line_items,
            success_url: 'http://localhost:5173/success',
            cancel_url: 'http://localhost:5173/fail',
            metadata: {
                orderId: subscribedData.orderId,
                userId: subscribedData.userId,
                ids: JSON.stringify(items.ids),
            }
        })
        if (url) {
            // send url to client via websocket
            const result = await prisma.$transaction(async (tx) => {
                const result = await tx.payments.create({
                    data: {
                        orderId: subscribedData.orderId,
                        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
                        status: "PENDING",
                    }
                })
                return result
            })
            if (result) {
                await redisClient.publish("WEBSOCKET_NOTIFY", JSON.stringify({ event: "PAYMENT_LINK_CREATED", data: { url: url, userId: subscribedData.userId } }))
            } else {
                // send payment generation error via websocket
                await redisClient.publish("WEBSOCKET_NOTIFY", JSON.stringify({ event: "PAYMENT_LINK_ERROR", data: { message: "Error generating payment error , please try again later" } }))
            }

        } else {
            // send payment generation error via websocket
            await redisClient.publish("WEBSOCKET_NOTIFY", JSON.stringify({ event: "PAYMENT_LINK_ERROR", data: { message: "Error generating payment error , please try again later" } }))
        }
    } catch (error) {
        console.log(error)
    }
})