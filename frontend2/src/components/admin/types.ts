export type TabId = "products" | "orders" | "payments" | "shipments" | "reports";

export interface Category {
    id: string;
    category: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface ProductImage {
    id: string;
    imageUrl: string;
}

/** Shape returned by GET / (the `select` in getProducts). */
export interface Product {
    id: string;
    productName: string;
    productDescription: string;
    price: number;
    quantity: number;
    discount: number | null;
    images: ProductImage[];
    category: { category: string } | null;
}

/** Body sent to POST /newProduct. Matches the required columns on `Products`. */
export interface NewProductInput {
    productName: string;
    productDescription: string;
    price: number;
    quantity: number;
    discount: number;
    reservedQuantity: number;
    categoryId: string;
}

/** Raw row returned by POST /newProduct (prisma.create without include). */
export interface CreatedProduct {
    id: string;
    productName: string;
    productDescription: string;
    price: number;
    quantity: number;
    discount: number | null;
    reservedQuantity: number;
    categoryId: string;
    createdAt: string;
    updatedAt: string;
}

export interface ProductSearchParams {
    name?: string;
    category?: string;
}