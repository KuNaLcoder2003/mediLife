export type Order = {
    orderId: string,
    products: { productId: string, quantity: number }[],
    userId: string
    trackingId: string
    addressId: string
    status: "CREATED" |
    "CONFIRMED" |
    "PACKING" |
    "SHIPPED" |
    "DISPATCHED" |
    "DELIVERED" |
    "CANCELLED" |
    "RETURNED"
    orderTotal: number
}

export type Product = {
    id: string;
    productName: string;
    productDescription: string;
    price: number;
    quantity: number;
    discount: number | null;
    reservedQuantity: number;
    categoryId: string;
    createdAt: Date;
    updatedAt: Date;
}