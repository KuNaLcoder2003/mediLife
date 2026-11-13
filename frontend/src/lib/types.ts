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
  /** Stock held by open orders (admin screens show quantity - reservedQuantity as "available"). */
  reservedQuantity?: number;
  images?: ProductImage[];
  category?: { category: string } | null;
  categoryId?: string;
  isActive?: boolean;
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

/** GET /users/me (add `mobile` and `country` to the server's select for the profile form). */
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  gender: string | null;
  age: number | null;
  mobile?: string | null;
  country?: string | null;
  addresses: Address[];
}

/** Body for PATCH /users/me. Email is not editable. */
export interface ProfileUpdate {
  name: string;
  gender: Gender | null;
  age: number | null;
  mobile: string | null;
  country: string | null;
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

/* ---------------- Orders ---------------- */

export type OrderStatus =
  | "CREATED"
  | "CONFIRMED"
  | "PACKING"
  | "SHIPPED"
  | "DISPATCHED"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURNED";

export interface OrderLine {
  product: {
    id: string;
    productName: string;
    productDescription: string;
    images: ProductImage[];
  };
  /** Not in the schema yet. Shown on the order page and invoice once the server returns them. */
  quantity?: number;
  unitPrice?: number;
}

/** Shape returned by POST /order/getOrders and POST /order/get/:orderId */
export interface Order {
  id: string;
  userId: string;
  trackingId: string;
  orderTotal: number;
  createdAt: string;
  /** Add `status: true` to the server's select to show it. */
  updatedAt?: string;
  status?: OrderStatus;
  orderedProducts: OrderLine[];
  address: Address;
  /** Admin views: filled in once the admin orders endpoint returns them. */
  payment?: { status: string; stripeID?: string } | null;
  customer?: { name: string; email: string; mobile?: string | null; createdAt?: string };
}

/* ---------------- Admin ---------------- */

/** Body sent to POST /product/newProduct. */
export interface NewProductInput {
  productName: string;
  productDescription: string;
  price: number;
  discount: number;
  quantity: number;
  reservedQuantity: number;
  categoryId: string;
}

/** Body sent (as { product }) to PATCH /product/edit/:productId. */
export interface EditProductInput {
  productName?: string;
  productDescription?: string;
  price?: number;
  quantity?: number;
  discount?: number;
  reservedQuantity?: number;
  categoryId?: string;
  isActive?: boolean;
}

/** Row returned by GET /users/allUsers. */
export interface Customer {
  id: string;
  name: string;
  email: string;
  mobile?: string | null;
  addresses: Pick<Address, "addressLine1" | "addressLine2" | "postalCode">[];
}