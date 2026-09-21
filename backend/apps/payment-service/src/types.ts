export type SubscribedData = {
    orderId: string, userId: string, products: { productId: string, quantity: number }[], total: number
}

export type EventPayload = {
    eventType: string,
    eventId: string,
    payload: SubscribedData,
    aggregateId: string,
    aggregateType: string
}