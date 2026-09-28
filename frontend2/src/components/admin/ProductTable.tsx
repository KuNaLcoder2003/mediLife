import type { Product } from "./types";
import { discountedPrice, formatPrice, stockLevel } from "./utils";
import Icon from "./Icon";

interface ProductTableProps {
    products: Product[];
    loading: boolean;
    hasFilters: boolean;
    highlightId: string | null;
    onClearFilters: () => void;
    onCreate: () => void;
    onOpen: (productId: string) => void;
    onAddImages: (product: Pick<Product, "id" | "productName">) => void;
}

export default function ProductTable({
    products,
    loading,
    hasFilters,
    highlightId,
    onClearFilters,
    onCreate,
    onOpen,
    onAddImages,
}: ProductTableProps) {
    if (loading && products.length === 0) {
        return (
            <div className="ap-table-wrap" aria-busy="true" aria-label="Loading products">
                {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="ap-skeleton-row">
                        <span className="ap-skel ap-skel--thumb" />
                        <span className="ap-skel ap-skel--line" />
                        <span className="ap-skel ap-skel--short" />
                    </div>
                ))}
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="ap-empty">
                {hasFilters ? (
                    <>
                        <h2>No products match these filters</h2>
                        <p>Try a different name or category, or clear the filters to see everything.</p>
                        <button type="button" className="ap-btn ap-btn--ghost" onClick={onClearFilters}>
                            Clear filters
                        </button>
                    </>
                ) : (
                    <>
                        <h2>No products yet</h2>
                        <p>Add your first product, then upload its photos.</p>
                        <button type="button" className="ap-btn ap-btn--primary" onClick={onCreate}>
                            <Icon name="plus" size={16} /> Add product
                        </button>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className={`ap-table-wrap${loading ? " is-refreshing" : ""}`}>
            <table className="ap-table">
                <thead>
                    <tr>
                        <th scope="col">Product</th>
                        <th scope="col">Category</th>
                        <th scope="col" className="num">
                            Price
                        </th>
                        <th scope="col" className="num">
                            Stock
                        </th>
                        <th scope="col">Images</th>
                        <th scope="col">
                            <span className="ap-sr">Actions</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((p) => {
                        const images = p.images ?? [];
                        return (
                            <tr key={p.id} className={p.id === highlightId ? "is-new" : undefined}>
                                <td>
                                    <button type="button" className="ap-product-cell" onClick={() => onOpen(p.id)}>
                                        {images[0] ? (
                                            <img className="ap-thumb" src={images[0].imageUrl} alt="" loading="lazy" />
                                        ) : (
                                            <span className="ap-thumb ap-thumb--empty">
                                                <Icon name="image" size={18} />
                                            </span>
                                        )}
                                        <span className="ap-product-text">
                                            <strong>{p.productName}</strong>
                                            <span className="ap-clamp">{p.productDescription}</span>
                                        </span>
                                    </button>
                                </td>
                                <td>{p.category?.category ?? <span className="ap-subtle">Uncategorised</span>}</td>
                                <td className="num">
                                    <PriceCell price={p.price} discount={p.discount} />
                                </td>
                                <td className="num">
                                    <StockCell quantity={p.quantity} />
                                </td>
                                <td>
                                    {images.length === 0 ? (
                                        <span className="ap-badge ap-badge--warn">None</span>
                                    ) : (
                                        <span className="ap-count">{images.length}</span>
                                    )}
                                </td>
                                <td className="ap-row-actions">
                                    <button
                                        type="button"
                                        className="ap-btn ap-btn--ghost ap-btn--sm"
                                        onClick={() => onAddImages({ id: p.id, productName: p.productName })}
                                    >
                                        <Icon name="upload" size={15} /> Add images
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function PriceCell({ price, discount }: { price: number; discount: number | null }) {
    const pct = discount ?? 0;
    if (pct <= 0) return <span className="ap-price">{formatPrice(price)}</span>;
    return (
        <span className="ap-price">
            <span>{formatPrice(discountedPrice(price, pct))}</span>
            <span className="ap-price-was">
                <s>{formatPrice(price)}</s> {pct}% off
            </span>
        </span>
    );
}

function StockCell({ quantity }: { quantity: number }) {
    const level = stockLevel(quantity);
    if (level === "out") return <span className="ap-stock ap-stock--out">Out of stock</span>;
    if (level === "low") return <span className="ap-stock ap-stock--low">{quantity} left</span>;
    return <span className="ap-stock">{quantity}</span>;
}