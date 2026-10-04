import nodemailer from "nodemailer";
import dotenv from "dotenv"
import { getRedisClient } from "@repo/redis";
const redisClient = await getRedisClient()
dotenv.config()
type mailId = string
type Attachment = {
    fileName: string,
    content: Buffer
    contentType: string
}

type EventPayload = {
    eventType: string,
    eventId: string,
    payload: { orderId: string, userId: string, eventType: string, refundId: string, userEmail: string, amount?: number },
    aggregateId: string,
    aggregateType: string
}
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

const refundInitiatedHtml = (orderId: string, refundId: string) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Refund Initiated</title>
</head>

<body style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: Arial, Helvetica, sans-serif; color: #333333;">

  <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">

    <div style="padding: 24px; text-align: center; border-bottom: 1px solid #eeeeee;">
      <h2 style="margin: 0; color: #222222;">Refund Initiated</h2>
    </div>

    <div style="padding: 32px 24px;">
      <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">
        Your refund has been successfully initiated.
      </p>

      <div style="background-color: #f8f9fb; padding: 16px; border-radius: 6px; margin: 24px 0;">
        <p style="margin: 0 0 10px 0; font-size: 14px;">
          <strong>Refund ID:</strong> ${refundId}
        </p>

        <p style="margin: 0; font-size: 14px;">
          <strong>Order ID:</strong> ${orderId}
        </p>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #555555;">
        If you have any questions regarding your refund, please contact our support team at
        <a href="mailto:support@medilinks.au.in" style="color: #2563eb; text-decoration: none;">
          support@medilinks.au.in
        </a>.
      </p>

      <p style="font-size: 14px; margin-bottom: 0;">
        Regards,<br />
        <strong>Medilinks</strong>
      </p>
    </div>

  </div>

</body>
</html>
`;
}

const refundNotInitiatedHtml = (orderId: string) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Refund Update</title>
</head>

<body style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: Arial, Helvetica, sans-serif; color: #333333;">

  <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">

    <div style="padding: 24px; text-align: center; border-bottom: 1px solid #eeeeee;">
      <h2 style="margin: 0; color: #222222;">Refund Update</h2>
    </div>

    <div style="padding: 32px 24px;">

      <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">
        We were unable to initiate a refund for your order.
      </p>

      <div style="background-color: #f8f9fb; padding: 16px; border-radius: 6px; margin: 24px 0;">
        <p style="margin: 0; font-size: 14px;">
          <strong>Order ID:</strong> ${orderId}
        </p>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #555555;">
        Please contact our support team for further assistance at
        <a href="mailto:support@medilinks.au.in" style="color: #2563eb; text-decoration: none;">
          support@medilinks.au.in
        </a>.
      </p>

      <p style="font-size: 14px; margin-bottom: 0;">
        Regards,<br />
        <strong>Medilinks</strong>
      </p>

    </div>

  </div>

</body>
</html>
`;
}

const refundConfirmedHtml = (orderId: string, refundId: string, refundAmount: number) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Refund Confirmed</title>
</head>

<body style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: Arial, Helvetica, sans-serif; color: #333333;">

  <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">

    <div style="padding: 24px; text-align: center; border-bottom: 1px solid #eeeeee;">
      <h2 style="margin: 0; color: #222222;">Refund Confirmed</h2>
    </div>

    <div style="padding: 32px 24px;">

      <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">
        Your refund has been successfully processed.
      </p>

      <div style="background-color: #f8f9fb; padding: 16px; border-radius: 6px; margin: 24px 0;">

        <p style="margin: 0 0 10px 0; font-size: 14px;">
          <strong>Refund ID:</strong> ${refundId}
        </p>

        <p style="margin: 0 0 10px 0; font-size: 14px;">
          <strong>Order ID:</strong> ${orderId}
        </p>

        <p style="margin: 0; font-size: 14px;">
          <strong>Refund Amount:</strong> ${refundAmount}
        </p>

      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #555555;">
        The refunded amount will be credited back to your original payment method.
        Depending on your bank or payment provider, it may take some time for the
        amount to appear in your account.
      </p>

      <p style="font-size: 14px; line-height: 1.6; color: #555555;">
        If you have any questions regarding your refund, please contact our support
        team at
        <a
          href="mailto:support@medilinks.au.in"
          style="color: #2563eb; text-decoration: none;"
        >
          support@medilinks.au.in
        </a>.
      </p>

      <p style="font-size: 14px; margin-bottom: 0;">
        Regards,<br />
        <strong>Medilinks</strong>
      </p>

    </div>

  </div>

</body>
</html>
`;
}

const mail = async (emailIds: mailId[], subject: string, html: string, attachments?: Attachment[]) => {
    const info = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: emailIds,
        subject: subject,
        html: html,
        attachments: attachments
    })
    return { info }
}


redisClient.subscribe("MAIL_USER", async (message) => {
    const data = JSON.parse(message) as EventPayload
    const { payload } = data
    switch (payload.eventType) {
        case "REFUND_MAIL":
            await mail([payload.userEmail], `${payload.refundId ? `Refund Initiated against order ${payload.orderId}` : `Unable to Initiate refund against order ${payload.orderId}`}`, payload.refundId ? refundInitiatedHtml(payload.orderId, payload.refundId) : refundNotInitiatedHtml(payload.orderId))
            break;
        case "CONFIRM_REFUND_MAIL":
            await mail([payload.userEmail], `Refund processed againts order ${payload.orderId}`, refundConfirmedHtml(payload.orderId, payload.refundId, payload.amount!))
            break
    }
})
