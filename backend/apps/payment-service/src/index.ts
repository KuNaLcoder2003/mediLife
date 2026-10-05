import Stripe from "stripe";
import dotenv from "dotenv"
import { getRedisClient } from "@repo/redis";
import type { EventPayload, SubscribedData } from "./types.js";
import { prisma } from "@repo/db";
dotenv.config()

const STRIPE_SECRET = `${process.env.STRIPE_SECRET_KEY}`
const stripe = new Stripe(STRIPE_SECRET)


const redisClient = await getRedisClient()
const duplicate = redisClient.duplicate()
duplicate.on('error', (err) => console.error('Redis duplicate error', err))
await duplicate.connect()

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
                        stripeID: url.id
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


duplicate.subscribe("INITIATE_REFUND", async (message) => {
    console.log('Subscribe to INITIATE_REFUND')
    const { payload } = JSON.parse(message) as EventPayload
    console.log(payload)
    try {
        if (!payload) {
            return
        }
        const { userId, orderId, products } = payload
        const user = await prisma.users.findUnique({
            where: {
                id: userId
            }
        })
        const payment = await prisma.payments.findUnique({
            where: {
                orderId: orderId,
                status: "COMPLETED"
            },
            select: {
                stripeID: true,
                id: true,
            }
        })
        console.log(payment)
        if (!payment) {
            return
        }
        const session = await stripe.checkout.sessions.retrieve(
            payment.stripeID
        );

        if (!session.payment_intent) {
            throw new Error("No PaymentIntent found for this Checkout Session");
        }

        const refund = await stripe.refunds.create({
            payment_intent: session.payment_intent as string,
            metadata: {
                orderId,
                userId,
                products: JSON.stringify(products)
            }
        });
        console.log('Stripe : ', refund!)


        await prisma.$transaction(async (tx) => {
            await tx.payments.update({
                where: {
                    id: payment.id
                },
                data: {
                    status: "CANCELLED" // => REFUND_INITIATED
                }
            })
            await tx.events.create({
                data: {
                    eventType: "MAIL_USER",
                    aggregateId: orderId,
                    aggregateType: "PAYMENTS",
                    payload: {
                        refundId: refund ? refund.id : "",
                        orderId: orderId,
                        userId: userId,
                        eventType: "REFUND_MAIL",
                        userEmail: user?.email
                    },
                    status: "CREATED",
                    attempts: 0
                }
            })
        })

        // if (!refund) {
        //     // mail to user about that refund could not be generated , please try again or contact support@medilinks.com


        // } else {
        //     // mail to user about that refund generated , and provide refund id , for any furthur queries , please contact support@medilinks.com
        // }

    } catch (error) {
        console.log(error)
    }
})