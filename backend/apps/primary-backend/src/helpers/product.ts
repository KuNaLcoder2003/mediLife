import { prisma } from "@repo/db";
import { uploadAsset } from "../utility/cloud.js";
export const fetchProductById = async (productId: string) => {
    const product = await prisma.products.findUnique({
        where: {
            id: productId
        },
        select: {
            productName: true,
            id: true,
            productDescription: true,
            quantity: true,
            price: true,
            discount: true,
            images: {
                select: {
                    imageUrl: true,
                    id: true
                }
            },
            category: {
                select: {
                    category: true
                }
            }
        }
    })

    if (!product) {
        return false
    }
    else {
        return product
    }
}

export const createProductImage = (data: { imageUrl: string, key: string, cloudId: string, productId: string }) => {
    return prisma.productIamges.create({
        data: data
    })
}

export const createMultipleImages = async (images: { imageUrl: string, key: string, cloudId: string, productId: string }[]) => {
    const result = await Promise.allSettled(images.map(async (obj) => {
        const entry = await createProductImage(obj)
        return entry
    }))

    let notCreated = []
    for (let i = 0; i < result.length; i++) {
        if (result[i]?.status == "rejected") {
            notCreated.push(images[i])
        }
    }
    if (notCreated.length > 0) {
        return {
            notCreated,
            valid: false
        }
    }
    return {
        valid: true,
    }
}

export const uploadMultipleAssetsToCloud = async (files: { fileBuffer: Buffer, fileName: string }[], productId: string) => {
    let flag = false
    let result: { imageUrl: string, key: string, cloudId: string, productId: string }[] = []
    if (!files) {
        flag = false
        return {
            valid: flag,
            uploaded: []
        }
    }

    for (let file of files) {
        const res = await uploadAsset(file.fileBuffer, file.fileName)
        if (!res.valid) {
            flag = false
            break
        }
        result.push({ imageUrl: res.url!, key: res.key as string, cloudId: res.key as string, productId: productId })
    }
    return {
        valid: flag,
        uploaded: result
    }

}