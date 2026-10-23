const BASE = import.meta.env.VITE_API_URL;

async function post<T>(path: string, body?: object): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || data.valid === false) {
    throw new Error(typeof data?.message === "string" ? data.message : `Request failed (${res.status})`);
  }
  return data as T;
}

async function get<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { credentials: "include" });
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || data.valid === false) {
    throw new Error(typeof data?.message === "string" ? data.message : `Request failed (${res.status})`);
  }
  return data as T;
}

/*Products */

export interface Product {
  id: string;
  productName: string;
  productDescription?: string;
  quantity: number;
  reservedQuantity?: number;
  price: number;
  discount: number | null;
  images?: { id: string; imageUrl: string }[];
  category?: { category: string } | null;
  categoryId?: string;
}

export const productApi = {
  list: async (name?: string) => {
    const q = name?.trim();
    const path = q ? `/product/?name=${encodeURIComponent(q)}` : "/product/";
    return (await get<{ products: Product[] }>(path)).products ?? [];
  },
};

/*Auth */

export const authApi = {
  signIn: async (email: string, password: string) =>
    (await post<{ accessToken: string }>("/auth/signin", { email, password })).accessToken,

  signUp: async (userDetails: object) =>
    (await post<{ accessToken: string }>("/auth/signup", { userDetails })).accessToken,

  googleUrl: async () => (await post<{ url: string }>("/auth/google")).url,
  forgotPassword: (email: string) => post<{ message?: string }>("/auth/forgot-password", { email }),
};

/*Admin- create products */

export interface NewProductInput {
  productName: string;
  productDescription: string;
  price: number;
  discount: number;
  quantity: number;
  reservedQuantity: number;
  categoryId: string;
}

export interface EditProductInput {
  productName?: string;
  productDescription?: string;
  price?: number;
  quantity?: number;
  discount?: number;
  reservedQuantity?: number;
  categoryId?: string;
}

export interface Category {
  id: string;
  category: string;
}

export const adminProductApi = {
  create: async (input: NewProductInput) =>
    (await post<{ product: { id: string } }>("/product/newProduct", input)).product,

  categories: async () =>
    (await get<{ categories: Category[] }>("/product/categories")).categories ?? [],

  createCategory: async (category: string) => {
    await post("/product/newCategory", { category });
  },

  update: async (productId: string, product: EditProductInput) => {
    await authRequest("PATCH", `/product/edit/${encodeURIComponent(productId)}`, { product });
  },

  remove: async (productId: string) => {
    await authRequest("DELETE", `/product/${encodeURIComponent(productId)}`);
  },

  uploadImages: (productId: string, files: File[], onProgress?: (percent: number) => void) =>
    new Promise<void>((resolve, reject) => {
      const form = new FormData();
      form.append("productId", productId); // text field first
      files.forEach((f) => form.append("product_images", f, f.name));

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${BASE}/product/newImages`);
      xhr.withCredentials = true;
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onerror = () => reject(new Error("Can't reach the server. Check your connection and try again."));
      xhr.onload = () => {
        const readReply = (): { valid?: boolean; message?: string } | null => {
          try { return JSON.parse(xhr.responseText); } catch { return null; }
        };
        const data = readReply();
        if (xhr.status >= 200 && xhr.status < 300 && data && data.valid !== false) resolve();
        else reject(new Error(data?.message ?? `Upload failed (${xhr.status})`));
      };
      xhr.send(form);
    }),
};

/*Requests that need the login token*/

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function refreshToken(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/auth/refresh`, { method: "POST", credentials: "include" });
    const body = await res.json().catch(() => null);
    const token = body?.access_token ?? body?.accessToken ?? null;
    if (res.ok && token) {
      localStorage.setItem("accessToken", token);
      return token;
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function authRequest<T>(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: object): Promise<T> {
  const send = (token: string | null) =>
    fetch(`${BASE}${path}`, {
      method,
      credentials: "include",
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

  let res: Response;
  try {
    res = await send(localStorage.getItem("accessToken"));
    if (res.status === 401 || res.status === 403) {
      const fresh = await refreshToken();
      if (fresh) res = await send(fresh);
    }
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || data.valid === false) {
    throw new ApiError(typeof data?.message === "string" ? data.message : `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

/* User and orders */

export interface User {
  id: string;
  name: string;
  email: string;
  mobile?: string | null;
  createdAt?: string;
}

export interface OrderLine {
  product: { id: string; productName: string; images?: { imageUrl: string }[] };
  quantity?: number;
  unitPrice?: number;
}

export interface Order {
  id: string;
  userId: string;
  trackingId: string;
  orderTotal: number;
  createdAt: string;
  updatedAt?: string;
  status?: string;
  orderedProducts: OrderLine[];
  address?: { postalCode: string; addressLine1: string; addressLine2?: string | null };
  payment?: { status: string; stripeID?: string } | null;
}

export const orderApi = {
  list: async (): Promise<Order[]> => {
    try {
      const data = await authRequest<{ orders: Order[] }>("POST", "/order/getOrders");
      return [...(data.orders ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return []; // the server says 404 when there are none
      throw e;
    }
  },

  get: async (id: string): Promise<Order | null> => {
    try {
      return (await authRequest<{ order: Order }>("POST", `/order/get/${encodeURIComponent(id)}`)).order;
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 400)) return null;
      throw e;
    }
  },
};

export const userApi = {
  me: async () => (await authRequest<{ user: User }>("GET", "/users/me")).user,
};