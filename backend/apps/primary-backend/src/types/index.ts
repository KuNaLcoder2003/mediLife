
export type UserDetails = {
    name: string,
    gender: "MALE" | "FEMALE"
    age?: number,
    email: string,
    mobile?: string,
    password?: string,
    country: string,
    role: "USER" | "COMPANY",
    authMode: "CREDENTIALS" | "GOOGLE"
}

export type Address = {
    id: string
    postalCode: string
    userId: string
    addressLine1: string
    addressLine2: string
}

export type Session = {
    id: string
    userId: string
    tokenHash: string
    expiresAt: Date
    revokedAt: Date
    createdAt: Date
    user: any
}

export type ProductImages = {
    id: string,
    imageUrl: string
    cloudId: string
    createdAt: Date
    updatedAt: Date
    productId: string
}

export type Products = {
    id: string
    productName: string
    productDescription: string
    price: number
    quantity: number
    discount: number
    reservedQuantity: number
    categoryId: string
    createdAt: Date
    updatedAt: Date
    images: ProductImages[]
}

export type ProductCategory = {
    id: string
    category: string
    products: Products[]
    createdAt: Date
    updatedAt: Date
}

export type NewOrderPayload = {
    products: { productId: string, quantity: number }[],
    addressId: string
}

export type Order = {
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

export type OrderPayLoad = {
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