/**
 * Every call the app makes to the MedLife API lives here.
 * Requests go through `request()` in ./http, which attaches the access token,
 * refreshes it once on 401/403 and turns `valid: false` replies into errors.
 */
import { API_BASE_URL } from "./config";
import { ApiError, refreshAccessToken, request, tokenStore } from "./http";
import type {
  Category,
  Customer,
  EditProductInput,
  NewAddressInput,
  NewOrderPayload,
  NewProductInput,
  Order,
  Product,
  ProfileUpdate,
  SignUpDetails,
  User,
} from "./types";

export { ApiError } from "./http";
export type * from "./types";

/* ---------------- Auth ---------------- */

export const authApi = {
  async signIn(email: string, password: string): Promise<string> {
    const data = await request<{ accessToken: string }>("/auth/signin", {
      method: "POST",
      // Spelling matches what the backend currently expects.
      body: { email, password, mode: "CREDENTAILS" },
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

  // Google sign-in is started by navigating to GET /auth/google/start (see auth/google.ts).

  async forgotPassword(email: string): Promise<{ message?: string }> {
    return request<{ message?: string }>("/auth/forgot-password", { method: "POST", body: { email } });
  },

  /** Needs `authRouter.post('/logout', logout)` on the server. */
  async logout(): Promise<void> {
    await request("/auth/logout", { method: "POST" });
  },
};

/* ---------------- Products (public) ---------------- */

export const productApi = {
  async list(name?: string, signal?: AbortSignal): Promise<Product[]> {
    const q = name?.trim();
    const data = await request<{ products: Product[] }>(
      q ? `/product/?name=${encodeURIComponent(q)}` : "/product/",
      { signal },
    );
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

/* ---------------- Products (admin) ---------------- */

/** Must match `upload.array("product_images", 5)` on the server. */
export const IMAGE_FIELD_NAME = "product_images";
export const MAX_IMAGES_PER_UPLOAD = 5;

function uploadOnce(
  productId: string,
  files: File[],
  token: string | null,
  onProgress?: (percent: number) => void,
): Promise<{ status: number; data: { valid?: boolean; message?: string } | null }> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    // Text fields first so multer has them before it streams the files.
    form.append("productId", productId);
    files.forEach((f) => form.append(IMAGE_FIELD_NAME, f, f.name));

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/product/newImages`);
    xhr.withCredentials = true;
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () => reject(new ApiError("Can't reach the server. Check your connection and try again.", 0));
    xhr.onload = () => {
      let data: { valid?: boolean; message?: string } | null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = null;
      }
      resolve({ status: xhr.status, data });
    };
    xhr.send(form);
  });
}

export const adminProductApi = {
  async create(input: NewProductInput): Promise<{ id: string }> {
    const data = await request<{ product: { id: string } }>("/product/newProduct", {
      method: "POST",
      body: input,
      auth: true,
    });
    return data.product;
  },

  categories: () => productApi.categories(),

  /** The endpoint doesn't return the new row: reload categories afterwards. */
  async createCategory(category: string): Promise<void> {
    await request("/product/newCategory", { method: "POST", body: { category }, auth: true });
  },

  async update(productId: string, product: EditProductInput): Promise<void> {
    await request(`/product/edit/${encodeURIComponent(productId)}`, {
      method: "PATCH",
      body: { product },
      auth: true,
    });
  },

  async remove(productId: string): Promise<void> {
    await request(`/product/${encodeURIComponent(productId)}`, { method: "DELETE", auth: true });
  },

  /** Multipart upload with progress (XHR, since fetch has no upload progress). */
  async uploadImages(productId: string, files: File[], onProgress?: (percent: number) => void): Promise<void> {
    let res = await uploadOnce(productId, files, tokenStore.get(), onProgress);
    if (res.status === 401 || res.status === 403) {
      const fresh = await refreshAccessToken();
      if (fresh) res = await uploadOnce(productId, files, fresh, onProgress);
    }
    if (res.status < 200 || res.status >= 300 || !res.data || res.data.valid === false) {
      throw new ApiError(res.data?.message ?? `Upload failed (${res.status})`, res.status, res.data);
    }
  },
};

/* ---------------- Users ---------------- */

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

/** Admin: every registered user (users.route.ts → GET /users/allUsers). */
export const customerApi = {
  async list(): Promise<Customer[]> {
    const data = await request<{ users: Customer[] }>("/users/allUsers", { auth: true });
    return (data.users ?? []).map((u) => ({ ...u, addresses: u.addresses ?? [] }));
  },
};

/* ---------------- Orders ---------------- */

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

  /** POST /order/cancel. Sends only the order ID: the server looks up the products itself. */
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

  /** POST /order/get/:orderId. Resolves to null when the order doesn't exist or isn't yours. */
  async get(orderId: string): Promise<Order | null> {
    try {
      const data = await request<{ order: Order }>(`/order/get/${encodeURIComponent(orderId)}`, {
        method: "POST",
        auth: true,
      });
      return data.order;
    } catch (err) {
      // 403 = someone else's order: treat it like "not found" too
      if (err instanceof ApiError && [400, 403, 404].includes(err.status)) return null;
      throw err;
    }
  },
};

/**
 * Admin: all orders. There is no admin orders endpoint on the server yet, so this
 * returns an empty list. When it exists, replace the body with e.g.:
 *   const data = await request<{ orders: Order[] }>("/admin/orders", { auth: true });
 *   return [...(data.orders ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
 */
export const adminOrderApi = {
  async list(): Promise<Order[]> {
    return [];
  },
};
