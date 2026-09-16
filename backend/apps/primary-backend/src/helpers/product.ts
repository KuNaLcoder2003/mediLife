import { prisma } from "@repo/db";
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