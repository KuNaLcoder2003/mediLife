import { prisma } from "@repo/db";
import type { Product } from "./types.js";



class InsufficientStockError extends Error {
    constructor(public product: { productId: string, quantity: number }) {
        super('Insufficient stock');
        this.name = 'InsufficientStockError';
    }
}

export const getProductById = async (id: string) => {
    const product = prisma.products.findUnique({
        where: {
            id: id
        }
    })

    return product
}

export const checkAvailabilityAndReserve = async (items: { productId: string, quantity: number }[]) => {
    try {
        await prisma.$transaction(async (tx) => {
            for (let item of items) {
                const result = await tx.products.updateMany({
                    where: {
                        id: item.productId,
                        quantity: {
                            gte: item.quantity
                        }
                    },
                    data: {
                        reservedQuantity: {
                            increment: item.quantity
                        },
                    }
                })
                if (result.count === 0) {
                    throw new InsufficientStockError(item)
                }
            }
        }, { maxWait: 10000, timeout: 10000 })
        return {
            event: "INVENTORY_RESERVED"
        }
    } catch (error) {
        console.log(error)
        if (error instanceof InsufficientStockError) {
            console.log('Insufficient stock:', error.product.productId);
            return {
                event: "INVENTORY_UNAVAILABLE",
                productId: error.product.productId
            }
        } else {
            // DB connection error 
            return {
                event: "DATABASE_CONNECTION_ERROR"
            }
        }
    }
}