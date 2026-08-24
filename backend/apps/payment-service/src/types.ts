export type SubscribedData = {
    orderId: string, userId: string, products: { productId: string, quantity: number }[], total: number
}