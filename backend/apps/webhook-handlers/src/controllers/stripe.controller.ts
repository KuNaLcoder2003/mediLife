import Stripe from "stripe"
import express from "express"
import dotenv from "dotenv"
// import { getRedisClient } from "@repo/redis"

import { updatePaymentStatus } from "../helpers/utility.js"
import { prisma } from "@repo/db"
dotenv.config()

const WEBHOOK_SECRET = `${process.env.STRIPE_WEBHOOK_SECRET_KEY}`
const STRIPE_SECRET = `${process.env.STRIPE_SECRET_KEY}`
const stripe = new Stripe(STRIPE_SECRET)

// const redisClient = await getRedisClient()

type Items = { productId: string, quantity: number }[]

const readMetadata = (metadata: Stripe.Metadata | null) => {
    const orderId = metadata?.orderId
    const userId = metadata?.userId ?? ""
    let products: Items = []
    try {
        products = JSON.parse(metadata?.products ?? "[]")
    } catch {
        products = []
    }
    return { orderId, userId, products }
}

// payment confirmed by Stripe: mark it and let order-service confirm the order
const paymentSucceeded = async (session: Stripe.Checkout.Session) => {
    // a completed checkout with a delayed method (bank debit...) isn't paid yet: wait for async_payment_succeeded
    if (session.payment_status !== "paid") return
    const { orderId, userId, products } = readMetadata(session.metadata)
    if (!orderId) return
    const result = await updatePaymentStatus(orderId, userId)
    if (result?.type == 'Error') {
        throw new Error(`Could not update payment for order ${orderId}`)
    }
    if (result?.type == 'Record_Already_Updated' || result?.updated) {
        await prisma.events.create({
            data: {
                aggregateId: orderId,
                aggregateType: "PAYMENT_CONFIRMED",
                eventType: "UPDATE_ORDER",
                status: "PENDING",
                attempts: 0,
                lastError: "",
                payload: { orderId: orderId, userId: userId, products: products, eventType: "PAYMENT_CONFIRMED" }
            }
        })
    }
}

// checkout failed or expired: close the order and free its reserved stock
const paymentNotCompleted = async (session: Stripe.Checkout.Session, paymentStatus: "FAILED" | "EXPIRED") => {
    const { orderId, userId, products } = readMetadata(session.metadata)
    if (!orderId) return
    await prisma.$transaction(async (tx) => {
        // only a still pending payment (a cancel may already have closed it)
        const payment = await tx.payments.updateMany({
            where: { orderId: orderId, status: "PENDING" },
            data: { status: paymentStatus }
        })
        if (payment.count === 0) return
        await tx.order.updateMany({
            where: { id: orderId, status: "CREATED" },
            data: { status: paymentStatus === "FAILED" ? "PAYMENT_FAILED" : "CANCELLED" }
        })
        await tx.events.create({
            data: {
                eventType: "INVENTORY_UPDATE",
                aggregateId: orderId,
                aggregateType: "INVENTORY",
                payload: { eventType: "RELEASE_RESERVATION", orderId: orderId, userId: userId, products: products },
                status: "PENDING",
                attempts: 0
            }
        })
        if (paymentStatus === "FAILED") {
            await tx.events.create({
                data: {
                    eventType: "PAYMENT_FAILED",
                    aggregateId: orderId,
                    aggregateType: "PAYMENT",
                    status: "PENDING",
                    lastError: "",
                    attempts: 0,
                    payload: { orderId: orderId, userId: userId, products: products }
                }
            })
        }
    }, { maxWait: 5000, timeout: 10000 })
}

const refundSucceeded = async (refund: Stripe.Refund) => {
    const { orderId, userId } = readMetadata(refund.metadata)
    if (!orderId) return
    await prisma.$transaction(async (tx) => {
        // CANCELLED covers refunds started before the REFUND_INITIATED status existed
        const updated = await tx.payments.updateMany({
            where: { orderId: orderId, status: { in: ["REFUND_INITIATED", "CANCELLED"] } },
            data: { status: "REFUNDED" }
        })
        if (updated.count === 0) return
        const user = await tx.users.findUnique({ where: { id: userId }, select: { email: true } })
        await tx.events.create({
            data: {
                eventType: "MAIL_USER",
                aggregateId: orderId,
                aggregateType: "PAYMENTS",
                payload: {
                    refundId: refund.id,
                    orderId: orderId,
                    userId: userId,
                    eventType: "CONFIRM_REFUND_MAIL",
                    userEmail: user?.email ?? "",
                    // Stripe amounts are in cents
                    amount: refund.amount / 100
                },
                status: "CREATED",
                attempts: 0
            }
        })
    }, { maxWait: 5000, timeout: 10000 })
}

export const stripeWebhookHandler = async (req: express.Request, res: express.Response) => {

    let event: Stripe.Event

    try {
        const signature = req.headers['stripe-signature'] as string
        event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            WEBHOOK_SECRET
        )
    } catch (error) {
        console.log(`Webhook signature verification failed.`, error);
        return res.sendStatus(400);
    }

    try {
        switch (event.type) {
            case "payment_intent.succeeded":
                break;

            case "checkout.session.completed":
            case "checkout.session.async_payment_succeeded":
                await paymentSucceeded(event.data.object)
                break;

            case "refund.updated":
                if (event.data.object.status == "succeeded") {
                    await refundSucceeded(event.data.object)
                }
                break;

            case "checkout.session.async_payment_failed":
                await paymentNotCompleted(event.data.object, "FAILED")
                break;

            case "checkout.session.expired":
                await paymentNotCompleted(event.data.object, "EXPIRED")
                break;
        }
    } catch (error) {
        console.log(error)
        // 500 makes Stripe retry the event later
        return res.sendStatus(500)
    }
    // Stripe keeps retrying until it gets a 2xx
    res.status(200).json({ received: true })
}
