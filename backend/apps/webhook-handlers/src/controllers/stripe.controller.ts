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


    switch (event.type) {
        case "payment_intent.succeeded":
            break;

        case "checkout.session.completed":
            let data = event.data.object
            let metadata = data.metadata as any;
            let orderId = metadata.orderId;
            let userId = metadata.userId;
            let products = JSON.parse(metadata.products) as { productId: string, quantity: number }[]
            const result = await updatePaymentStatus(orderId, userId)
            if (result?.type == 'Record_Already_Updated' || result?.updated) {
                await prisma.events.create({
                    data: {
                        aggregateId: orderId,
                        aggregateType: "PAYMENT_CONFIRMED",
                        eventType: "UPDATE_ORDER",
                        status: "PENDING",
                        attempts: 0,
                        lastError: "",
                        payload: { orderId: orderId, userId: userId, products: products }
                    }
                })
            }
            break;

        case "checkout.session.async_payment_failed":
            let { order_id } = event.data.object.metadata as any
            await prisma.$transaction(async (tx) => {
                await tx.order.update({
                    where: {
                        id: order_id
                    },
                    data: {
                        status: "CANCELLED"
                    }
                })
                await tx.payments.update({
                    where: {
                        orderId: order_id,
                    },
                    data: {
                        status: "FAILED"
                    }
                })
                await tx.events.create({
                    data: {
                        eventType: "PAYMENT_FAILED",
                        aggregateId: order_id,
                        aggregateType: "PAYMENT",
                        status: "PENDING",
                        lastError: "",
                        attempts: 0,
                        payload: event.data.object.metadata as any
                    }
                })
            }, { maxWait: 5000, timeout: 10000 })
            break;
    }
}
// const checkOutSessionCompleted = (orderId: string, userId: string) => {
//     try {
//         // when payment succedds => write to db , send ORDERUPDATE EVENT , send CREATE TRACKING EVENT

//     } catch (error) {
//         console.log(error)
//     }
// }



