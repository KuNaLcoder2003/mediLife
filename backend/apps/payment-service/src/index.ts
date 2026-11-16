import Stripe from "stripe";
import dotenv from "dotenv"
import { getRedisClient } from "@repo/redis";
import type { EventPayload, SubscribedData } from "./types.js";
import { prisma } from "@repo/db";
dotenv.config()

const STRIPE_SECRET = `${process.env.STRIPE_SECRET_KEY}`
const stripe = new Stripe(STRIPE_SECRET)
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173"
// Stripe needs at least 30 minutes; Payments.expiresAt uses the same time
const CHECKOUT_TTL_MS = 31 * 60 * 1000


const redisClient = await getRedisClient()
const duplicate = redisClient.duplicate()
duplicate.on('error', (err) => console.error('Redis duplicate error', err))
await duplicate.connect()

const getProducts = async (orderId: string, items: { productId: string, quantity: number }[]) => {
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
            discount: true,
            images: {
                select: {
                    imageUrl: true
                }
            },
            price: true,
        },
    })
    // charge the price the customer saw when ordering (saved with the order lines)
    const orderLines = await prisma.orderdProducts.findMany({
        where: { orderId: orderId },
        select: { productId: true, priceAtPurchase: true }
    })
    const priceAtPurchase = new Map(orderLines.map(line => [line.productId, line.priceAtPurchase]))

    // match by id: findMany does not return rows in the order of `ids`
    let result = items.map(item => {
        const product = products.find(p => p.id === item.productId)
        if (!product) {
            throw new Error(`Product ${item.productId} not found`)
        }
        const unitPrice = priceAtPurchase.get(item.productId) || product.price * (1 - (product.discount ?? 0) / 100)
        return {
            price_data: {
                currency: "usd",
                product_data: {
                    name: product.productName,
                    description: product.productDescription,
                },
                // Stripe only accepts whole cents
                unit_amount: Math.round(unitPrice * 100),
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
        // a repeated event must not create a second checkout
        const existing = await prisma.payments.findUnique({ where: { orderId: payload.orderId }, select: { id: true } })
        if (existing) {
            console.log(`[payment] payment already exists for order ${payload.orderId}, skipping`)
            return
        }
        const items = await getProducts(payload.orderId, payload.products)
        const url = await stripe.checkout.sessions.create({
            mode: "payment",
            line_items: items.line_items,
            success_url: `${FRONTEND_URL}/success?orderId=` + payload.orderId,
            cancel_url: `${FRONTEND_URL}/fail`,
            expires_at: Math.floor((Date.now() + CHECKOUT_TTL_MS) / 1000),
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
                        expiresAt: new Date(Date.now() + CHECKOUT_TTL_MS),
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
        // no payment link: close the order, free its stock and tell the user (instead of leaving checkout waiting)
        await prisma.$transaction(async (tx) => {
            const cancelled = await tx.order.updateMany({
                where: { id: payload.orderId, status: "CREATED" },
                data: { status: "CANCELLED" }
            })
            if (cancelled.count === 1) {
                await tx.events.create({
                    data: {
                        eventType: "INVENTORY_UPDATE",
                        aggregateId: payload.orderId,
                        aggregateType: "INVENTORY",
                        payload: { eventType: "RELEASE_RESERVATION", orderId: payload.orderId, userId: payload.userId, products: payload.products },
                        status: "PENDING",
                        attempts: 0
                    }
                })
            }
            await tx.events.create({
                data: {
                    eventType: "PAYMENT_LINK_ERROR",
                    aggregateId: payload.orderId,
                    aggregateType: "PAYMENTS",
                    payload: { ...payload, message: "We couldn't start the payment for your order. Please try again." },
                    status: "PENDING",
                    lastError: error instanceof Error ? error.message : "",
                    attempts: 0
                }
            })
        }, { maxWait: 5000, timeout: 10000 }).catch((err) => console.log('[payment] could not record payment link error', err))
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
            },
            select: {
                stripeID: true,
                id: true,
                status: true,
            }
        })
        console.log(payment)
        if (!payment) {
            return
        }

        // not paid yet: close the checkout so it can't be paid any more
        if (payment.status === "PENDING") {
            try {
                await stripe.checkout.sessions.expire(payment.stripeID)
                await prisma.payments.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: "CANCELLED" } })
                return
            } catch (error) {
                // expire fails when the session is already complete: check whether the customer paid
                const session = await stripe.checkout.sessions.retrieve(payment.stripeID)
                if (session.payment_status !== "paid") {
                    await prisma.payments.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: "CANCELLED" } })
                    return
                }
                // paid just before the cancel: mark it and refund below
                await prisma.payments.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: "COMPLETED" } })
                payment.status = "COMPLETED"
            }
        }
        if (payment.status !== "COMPLETED") {
            // already refunded / cancelled / failed
            return
        }

        const session = await stripe.checkout.sessions.retrieve(
            payment.stripeID
        );

        if (!session.payment_intent) {
            throw new Error("No PaymentIntent found for this Checkout Session");
        }

        let refund: Stripe.Refund
        try {
            refund = await stripe.refunds.create({
                payment_intent: session.payment_intent as string,
                metadata: {
                    orderId,
                    userId,
                    products: JSON.stringify(products)
                }
            }, { idempotencyKey: `refund_${orderId}` });
        } catch (error) {
            console.log(error)
            // mail to user that the refund could not be started (template for an empty refundId)
            await prisma.events.create({
                data: {
                    eventType: "MAIL_USER",
                    aggregateId: orderId,
                    aggregateType: "PAYMENTS",
                    payload: { refundId: "", orderId: orderId, userId: userId, eventType: "REFUND_MAIL", userEmail: user?.email ?? "" },
                    status: "CREATED",
                    attempts: 0
                }
            })
            return
        }
        console.log('Stripe : ', refund!)


        await prisma.$transaction(async (tx) => {
            const updated = await tx.payments.updateMany({
                where: {
                    id: payment.id,
                    status: "COMPLETED"
                },
                data: {
                    status: "REFUND_INITIATED"
                }
            })
            if (updated.count === 0) return
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
                        userEmail: user?.email ?? ""
                    },
                    status: "CREATED",
                    attempts: 0
                }
            })
        })

    } catch (error) {
        console.log(error)
    }
})
