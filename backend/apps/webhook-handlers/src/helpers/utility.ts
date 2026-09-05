import { prisma } from "@repo/db";

export const updatePaymentStatus = async (orderId: string, userId: string) => {
    let obj!: { updated: boolean, type: string }
    try {
        const updatedPayment = await prisma.$transaction(async (tx) => {
            const res = await tx.payments.updateMany({
                where: {
                    orderId: orderId,
                    status: "PENDING"
                },
                data: {
                    status: "COMPLETED",
                }
            })
            if (res.count == 0) {
                obj = {
                    updated: false,
                    type: 'Record_Already_Updated',
                }
            } else {
                obj = {
                    updated: true,
                    type: 'Record_Updated',
                }
            }
        }, { maxWait: 5000, timeout: 10000 })

        return obj

    } catch (error) {
        console.log(error)
        return {
            updated: false,
            type: 'Error'
        }
    }
}