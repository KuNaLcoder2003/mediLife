export interface ProductImage {
  id: string;
  imageUrl: string;
}

/** Shape returned by GET /product and GET /product/:id. */
export interface Product {
  id: string;
  productName: string;
  productDescription: string;
  price: number;
  quantity: number;
  discount: number | null;
  images?: ProductImage[];
  category?: { category: string } | null;
}

export interface Category {
  id: string;
  category: string;
}

export interface Address {
  id: string;
  postalCode: string;
  userId: string;
  addressLine1: string;
  addressLine2?: string | null;
  createdAt?: string;
}

/** GET /users/me */
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  gender: string | null;
  age: number | null;
  addresses: Address[];
}

export type Gender = "MALE" | "FEMALE";

/** Mirrors backend `UserDetails`, sent as { userDetails } to POST /auth/signup. */
export interface SignUpDetails {
  name: string;
  gender: Gender;
  age?: number;
  email: string;
  mobile?: string;
  password: string;
  country: string;
  role: "USER";
  authMode: "CREDENTIALS";
}

export interface NewAddressInput {
  postalCode: string;
  addressLine1: string;
  addressLine2: string;
}

/** Mirrors backend `NewOrderPayload`. */
export interface NewOrderPayload {
  products: { productId: string; quantity: number }[];
  addressId: string;
}
