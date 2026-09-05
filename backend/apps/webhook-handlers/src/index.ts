import express from "express"
import cors from "cors"
import { stripeWebhookHandler } from "./controllers/stripe.controller.js"
const app = express()

app.use(cors())

app.post('/handler/stripe', express.raw({ type: 'application/json' }), stripeWebhookHandler)

app.use(express.json())

app.listen(4000, () => {
    console.log('Webhook handlers')
})