import { request } from "./http";
import type { Category, NewAddressInput, NewOrderPayload, Product, SignUpDetails, User } from "./types";

export const authApi = {
  async signIn(email: string, password: string): Promise<string> {
    const data = await request<{ accessToken: string }>("/auth/signin", {
      method: "POST",
      body: { email, password },
    });
    return data.accessToken;
  },

  async signUp(userDetails: SignUpDetails): Promise<string> {
    const data = await request<{ accessToken: string }>("/auth/signup", {
      method: "POST",
      body: { userDetails },
    });
    return data.accessToken;
  },

  async googleAuthUrl(): Promise<string> {
    const data = await request<{ url: string }>("/auth/google", { method: "POST" });
    return data.url;
  },

  /** Needs `authRouter.post('/logout', logout)` on the server. */
  async logout(): Promise<void> {
    await request("/auth/logout", { method: "POST" });
  },
};

export const productApi = {
  async list(name?: string, signal?: AbortSignal): Promise<Product[]> {
    const q = name?.trim();
    const data = await request<{ products: Product[] }>(q ? `/product/?name=${encodeURIComponent(q)}` : "/product/", { signal });
    return data.products ?? [];
  },

  async getById(productId: string): Promise<Product> {
    const data = await request<{ product: Product }>(`/product/get/${encodeURIComponent(productId)}`);
    return data.product;
  },

  async categories(): Promise<Category[]> {
    const data = await request<{ categories: Category[] }>("/product/categories");
    return data.categories ?? [];
  },
};

export const userApi = {
  async me(): Promise<User> {
    const data = await request<{ user: User }>("/users/me", { auth: true });
    return { ...data.user, addresses: data.user.addresses ?? [] };
  },

  /** Route exists (POST /users/address) but has no controller yet. */
  async addAddress(input: NewAddressInput): Promise<void> {
    await request("/users/address", { method: "POST", body: input, auth: true });
  },
};

export interface CreatedOrder {
  message: string;
  /** Returned if newOrder sends `orderId`; used to match the payment link to this order. */
  orderId?: string;
}

export const orderApi = {
  /** userId is ignored once the server reads it from the token (authMiddleware). */
  async create(userId: string, orderDetails: NewOrderPayload): Promise<CreatedOrder> {
    const data = await request<{ message?: string; orderId?: string }>("/order/newOrder", {
      method: "POST",
      body: { userId, orderDetails },
      auth: true,
    });
    return { message: data.message ?? "Order placed", orderId: data.orderId };
  },
};