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

export interface Product {
  id: string;
  productName: string;
  productDescription?: string;
  quantity: number;
  reservedQuantity?: number; // arrives once the backend adds it to the select
  price: number;
  discount: number | null;
  images?: { id: string; imageUrl: string }[];
  category?: { category: string } | null;
}

export const productApi = {
  list: async (name?: string) => {
    const q = name?.trim();
    const path = q ? `/product/?name=${encodeURIComponent(q)}` : "/product/";
    return (await get<{ products: Product[] }>(path)).products ?? [];
  },
};

export const authApi = {
  signIn: async (email: string, password: string) =>
    (await post<{ accessToken: string }>("/auth/signin", { email, password })).accessToken,

  signUp: async (userDetails: object) =>
    (await post<{ accessToken: string }>("/auth/signup", { userDetails })).accessToken,

  googleUrl: async () => (await post<{ url: string }>("/auth/google")).url,
  forgotPassword: (email: string) => post<{ message?: string }>("/auth/forgot-password", { email }),
};

export interface NewProductInput {
  productName: string;
  productDescription: string;
  price: number;
  discount: number;
  quantity: number;
  reservedQuantity: number;
  categoryId: string;
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

  uploadImages: (productId: string, files: File[], onProgress?: (percent: number) => void) =>
    new Promise<void>((resolve, reject) => {
      const form = new FormData();
      form.append("productId", productId);
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