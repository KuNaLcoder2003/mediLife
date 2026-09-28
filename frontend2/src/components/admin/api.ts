import type {
    Category,
    CreatedProduct,
    NewProductInput,
    Product,
    ProductSearchParams,
} from "./types";

export const API_BASE_URL = "http://localhost:3000/api/v1/product";

/** Must match `upload.array("product_images", 5)` on the server. */
export const IMAGE_FIELD_NAME = "product_images";
export const MAX_IMAGES_PER_UPLOAD = 5;

export class ApiError extends Error {
    status: number;
    details: unknown;

    constructor(message: string, status: number, details?: unknown) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.details = details;
    }
}

interface BaseResponse {
    valid: boolean;
    message?: string;
}

async function request<T extends BaseResponse>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
        res = await fetch(`${API_BASE_URL}${path}`, init);
    } catch {
        throw new ApiError(
            "Can't reach the server. Check that the API is running and allows requests from this origin (CORS).",
            0,
        );
    }

    let body: T | null = null;
    try {
        body = (await res.json()) as T;
    } catch {
        body = null;
    }

    // The backend sometimes answers 200 with valid:false (e.g. image upload), so check both.
    if (!res.ok || !body || body.valid === false) {
        throw new ApiError(body?.message ?? `Request failed with status ${res.status}`, res.status, body);
    }
    return body;
}

const postJson = (data: unknown): RequestInit => ({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
});

export const productsApi = {
    async list(params: ProductSearchParams = {}): Promise<Product[]> {
        const qs = new URLSearchParams();
        if (params.name?.trim()) qs.set("name", params.name.trim());
        if (params.category?.trim()) qs.set("category", params.category.trim());
        const query = qs.toString();
        const data = await request<BaseResponse & { products: Product[] }>(query ? `/?${query}` : "/");
        return data.products ?? [];
    },

    async getById(productId: string): Promise<Product> {
        const data = await request<BaseResponse & { product: Product }>(`/get/${encodeURIComponent(productId)}`);
        return data.product;
    },

    async create(input: NewProductInput): Promise<CreatedProduct> {
        const data = await request<BaseResponse & { product: CreatedProduct }>("/newProduct", postJson(input));
        return data.product;
    },

    async listCategories(): Promise<Category[]> {
        const data = await request<BaseResponse & { categories: Category[] }>("/categories");
        return data.categories ?? [];
    },

    /** Server should read `req.body.category` (see notes). The endpoint doesn't return the new row. */
    async createCategory(category: string): Promise<void> {
        await request<BaseResponse>("/newCategory", postJson({ category }));
    },

    async uploadImages(productId: string, files: File[]): Promise<{ productId: string }> {
        const form = new FormData();
        // Text fields first so multer has them before it streams the files.
        form.append("productId", productId);
        files.forEach((file) => form.append(IMAGE_FIELD_NAME, file, file.name));
        // Don't set Content-Type: the browser adds the multipart boundary.
        return request<BaseResponse & { productId: string }>("/newImages", { method: "POST", body: form });
    },
};