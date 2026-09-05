import Stripe from "stripe"
import express from "express"
import dotenv from "dotenv"
import { getRedisClient } from "@repo/redis"
import { updatePaymentStatus } from "../helpers/utility.js"
dotenv.config()

const WEBHOOK_SECRET = `${process.env.STRIPE_WEBHOOK_SECRET_KEY}`
const STRIPE_SECRET = `${process.env.STRIPE_SECRET_KEY}`
const stripe = new Stripe(STRIPE_SECRET)
const redisClient = await getRedisClient()
export const stripeWebhookHandler = async (req: express.Request, res: express.Response) => {
    console.log('REACHED WEBHOOK HANDLER OF STRIPE')
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
            let eventID = metadata.eventId; // FOR FUTURE USE
            let productIds = JSON.parse(metadata.ids) as string[]
            console.log('\n')
            console.log('-----------------------------')
            console.log('\n')
            console.log('Metadata is : ', metadata)
            console.log('\n')
            console.log('-----------------------------')
            console.log('\n')
            const result = await updatePaymentStatus(orderId, userId)
            console.log(result)
            if (result?.type == 'Record_Already_Updated' || result?.updated) {
                await redisClient.publish("UPDATE_ORDER", JSON.stringify({ eventId: "PAYMENT_CONFIRMED_UPDATE_ORDER" + new Date(), eventType: "PAYMENT_CONFIRMED", orderId: orderId, userId: userId, productIds: productIds }))
            }
            break;
        case "checkout.session.async_payment_failed":
            break;
    }
}
const checkOutSessionCompleted = (orderId: string, userId: string) => {
    try {
        // when payment succedds => write to db , send ORDERUPDATE EVENT , send CREATE TRACKING EVENT

    } catch (error) {
        console.log(error)
    }
}



