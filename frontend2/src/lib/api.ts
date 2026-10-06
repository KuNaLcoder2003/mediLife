import { ApiError, request } from "./http";
import type {
  Category,
  NewAddressInput,
  NewOrderPayload,
  Order,
  Product,
  ProfileUpdate,
  SignUpDetails,
  User,
} from "./types";

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

  /** Needs `usersRouter.patch('/me', authMiddleware, updateUserDetails)` on the server. */
  async updateProfile(update: ProfileUpdate): Promise<void> {
    await request("/users/me", { method: "PATCH", body: update, auth: true });
  },

  /** POST /users/address */
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

  /**
   * POST /order/cancel. Sends only the order ID: the server must look up the
   * order's products itself (the client can't be trusted with quantities).
   */
  async cancel(orderId: string): Promise<string> {
    const data = await request<{ message?: string }>("/order/cancel", {
      method: "POST",
      body: { orderId },
      auth: true,
    });
    return data.message ?? "Order cancelled";
  },

  /** POST /order/getOrders. The server answers 404 when there are none, so that becomes []. */
  async list(): Promise<Order[]> {
    try {
      const data = await request<{ orders: Order[] }>("/order/getOrders", { method: "POST", auth: true });
      return [...(data.orders ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return [];
      throw err;
    }
  },

  /** POST /order/get/:orderId. Resolves to null when the order doesn't exist. */
  async get(orderId: string): Promise<Order | null> {
    try {
      const data = await request<{ order: Order }>(`/order/get/${encodeURIComponent(orderId)}`, {
        method: "POST",
        auth: true,
      });
      return data.order;
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 400)) return null;
      throw err;
    }
  },
};