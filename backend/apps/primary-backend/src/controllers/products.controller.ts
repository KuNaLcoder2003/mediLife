import express from "express"
import { prisma } from "@repo/db"

export const getProductById = async (id: string) => {
    const product = prisma.products.findUnique({
        where: {
            id: id
        }
    })

    return product
}