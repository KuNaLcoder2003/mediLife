import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { productsApi } from "./api";
import type { Category, CreatedProduct, Product } from "./types";
import { errorMessage, useDebouncedValue } from "./utils";
import Icon from "./Icon";
import AddProductForm from "./AddProductForm";
import ImageUploader from "./ImageUploader";
import ProductDetailDrawer from "./Productdetaildrawer";
import ProductTable from "./ProductTable";
import Stepper from "./Stepper";

type ProductRef = Pick<Product, "id" | "productName">;

type View =
    | { kind: "list" }
    | { kind: "create" }
    | { kind: "images"; product: ProductRef; afterCreate: boolean };

export default function ProductsTab() {
    const [view, setView] = useState<View>({ kind: "list" });

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [categories, setCategories] = useState<Category[]>([]);
    const [categoriesError, setCategoriesError] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [onlyMissingImages, setOnlyMissingImages] = useState(false);

    const [highlightId, setHighlightId] = useState<string | null>(null);
    const [detailId, setDetailId] = useState<string | null>(null);

    const debouncedSearch = useDebouncedValue(search, 300);
    const requestIdRef = useRef(0);

    const loadProducts = useCallback(async (name: string) => {
        const requestId = ++requestIdRef.current;
        setLoading(true);
        setError(null);
        try {
            const data = await productsApi.list({ name });
            if (requestId === requestIdRef.current) setProducts(data);
        } catch (err) {
            if (requestId === requestIdRef.current) setError(errorMessage(err, "Products couldn't be loaded."));
        } finally {
            if (requestId === requestIdRef.current) setLoading(false);
        }
    }, []);

    const loadCategories = useCallback(async (): Promise<Category[]> => {
        try {
            const data = await productsApi.listCategories();
            setCategories(data);
            setCategoriesError(null);
            return data;
        } catch (err) {
            setCategoriesError(errorMessage(err, "Categories couldn't be loaded."));
            return [];
        }
    }, []);

    useEffect(() => {
        void loadProducts(debouncedSearch);
    }, [debouncedSearch, loadProducts]);

    useEffect(() => {
        void loadCategories();
    }, [loadCategories]);

    // The API's `category` query matches product names, so category filtering happens here.
    const visibleProducts = useMemo(
        () =>
            products.filter(
                (p) =>
                    (categoryFilter === "all" || p.category?.category === categoryFilter) &&
                    (!onlyMissingImages || (p.images?.length ?? 0) === 0),
            ),
        [products, categoryFilter, onlyMissingImages],
    );

    const hasFilters = search.trim() !== "" || categoryFilter !== "all" || onlyMissingImages;

    const clearFilters = () => {
        setSearch("");
        setCategoryFilter("all");
        setOnlyMissingImages(false);
    };

    const refresh = () => void loadProducts(debouncedSearch);

    const backToList = () => {
        setView({ kind: "list" });
        refresh();
    };

    const handleCreated = (created: CreatedProduct) => {
        setHighlightId(created.id);
        setView({
            kind: "images",
            product: { id: created.id, productName: created.productName },
            afterCreate: true,
        });
        refresh();
    };

    const openImageUpload = (product: ProductRef) => {
        setDetailId(null);
        setView({ kind: "images", product, afterCreate: false });
    };

    /* ---------- Add product: step 1 (details) and step 2 (images) ---------- */
    if (view.kind === "create" || (view.kind === "images" && view.afterCreate)) {
        return (
            <section className="ap-page">
                <header className="ap-page-head">
                    <button type="button" className="ap-back" onClick={backToList}>
                        <Icon name="back" size={16} /> Products
                    </button>
                    <h1>Add product</h1>
                </header>

                <Stepper steps={["Product details", "Images"]} current={view.kind === "create" ? 0 : 1} />

                {view.kind === "create" ? (
                    <AddProductForm
                        categories={categories}
                        categoriesError={categoriesError}
                        onReloadCategories={loadCategories}
                        onCreated={handleCreated}
                        onCancel={backToList}
                    />
                ) : (
                    <ImageUploader
                        productId={view.product.id}
                        productName={view.product.productName}
                        intro={`${view.product.productName} is saved. Add photos now, or skip and add them later from the product list.`}
                        doneLabel="Go to products"
                        onDone={backToList}
                        onSkip={backToList}
                    />
                )}
            </section>
        );
    }

    /* ---------- Add images to an existing product ---------- */
    if (view.kind === "images") {
        return (
            <section className="ap-page">
                <header className="ap-page-head">
                    <button type="button" className="ap-back" onClick={backToList}>
                        <Icon name="back" size={16} /> Products
                    </button>
                    <h1>Add images</h1>
                    <p className="ap-subtle">{view.product.productName}</p>
                </header>
                <ImageUploader
                    productId={view.product.id}
                    productName={view.product.productName}
                    doneLabel="Back to products"
                    onDone={backToList}
                />
            </section>
        );
    }

    /* ---------- Product list ---------- */
    return (
        <section className="ap-page">
            <header className="ap-page-head ap-page-head--row">
                <div>
                    <h1>Products</h1>
                    <p className="ap-subtle">
                        {loading && products.length === 0
                            ? "Loading products…"
                            : `${products.length} ${products.length === 1 ? "product" : "products"}`}
                    </p>
                </div>
                <button type="button" className="ap-btn ap-btn--primary" onClick={() => setView({ kind: "create" })}>
                    <Icon name="plus" size={16} /> Add product
                </button>
            </header>

            <div className="ap-toolbar">
                <label className="ap-search">
                    <Icon name="search" size={16} />
                    <span className="ap-sr">Search products</span>
                    <input
                        type="search"
                        placeholder="Search by product name"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </label>

                <select
                    className="ap-select"
                    aria-label="Filter by category"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                >
                    <option value="all">All categories</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.category}>
                            {c.category}
                        </option>
                    ))}
                </select>

                <label className="ap-toggle">
                    <input
                        type="checkbox"
                        checked={onlyMissingImages}
                        onChange={(e) => setOnlyMissingImages(e.target.checked)}
                    />
                    Missing images
                </label>

                <button type="button" className="ap-icon-btn" onClick={refresh} aria-label="Refresh products">
                    <Icon name="refresh" size={16} />
                </button>
            </div>

            {error && (
                <div className="ap-alert ap-alert--error" role="alert">
                    <span>{error}</span>
                    <button type="button" className="ap-link" onClick={refresh}>
                        Try again
                    </button>
                </div>
            )}

            <ProductTable
                products={visibleProducts}
                loading={loading}
                hasFilters={hasFilters}
                highlightId={highlightId}
                onClearFilters={clearFilters}
                onCreate={() => setView({ kind: "create" })}
                onOpen={setDetailId}
                onAddImages={openImageUpload}
            />

            {detailId && (
                <ProductDetailDrawer
                    productId={detailId}
                    onClose={() => setDetailId(null)}
                    onAddImages={openImageUpload}
                />
            )}
        </section>
    );
}