import { useEffect, useRef, useState } from "react";
import { productsApi } from "./api";
import type { Product } from "./types";
import { discountedPrice, errorMessage, formatPrice, stockLevel } from "./utils";
import Icon from "./Icon";

interface ProductDetailDrawerProps {
    productId: string;
    onClose: () => void;
    onAddImages: (product: Pick<Product, "id" | "productName">) => void;
}

export default function ProductDetailDrawer({ productId, onClose, onAddImages }: ProductDetailDrawerProps) {
    const [product, setProduct] = useState<Product | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeImage, setActiveImage] = useState(0);
    const closeRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        let cancelled = false;
        setProduct(null);
        setError(null);
        setActiveImage(0);
        productsApi
            .getById(productId)
            .then((p) => !cancelled && setProduct(p))
            .catch((err) => !cancelled && setError(errorMessage(err, "This product couldn't be loaded.")));
        return () => {
            cancelled = true;
        };
    }, [productId]);

    useEffect(() => {
        closeRef.current?.focus();
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const images = product?.images ?? [];
    const discount = product?.discount ?? 0;

    return (
        <div className="ap-overlay" onClick={onClose}>
            <aside
                className="ap-drawer"
                role="dialog"
                aria-modal="true"
                aria-label={product?.productName ?? "Product details"}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="ap-drawer-head">
                    <h2>{product?.productName ?? "Product details"}</h2>
                    <button ref={closeRef} type="button" className="ap-icon-btn" onClick={onClose} aria-label="Close">
                        <Icon name="x" size={16} />
                    </button>
                </div>

                {error && (
                    <div className="ap-alert ap-alert--error" role="alert">
                        {error}
                    </div>
                )}

                {!product && !error && <p className="ap-subtle">Loading…</p>}

                {product && (
                    <>
                        <div className="ap-gallery">
                            {images.length > 0 ? (
                                <img className="ap-gallery-main" src={images[activeImage]?.imageUrl} alt={product.productName} />
                            ) : (
                                <div className="ap-gallery-main ap-gallery-empty">
                                    <Icon name="image" size={28} />
                                    <span>No images yet</span>
                                </div>
                            )}
                            {images.length > 1 && (
                                <div className="ap-gallery-thumbs">
                                    {images.map((img, i) => (
                                        <button
                                            key={img.id}
                                            type="button"
                                            className={i === activeImage ? "is-active" : undefined}
                                            onClick={() => setActiveImage(i)}
                                            aria-label={`Show image ${i + 1}`}
                                        >
                                            <img src={img.imageUrl} alt="" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <p className="ap-drawer-desc">{product.productDescription}</p>

                        <dl className="ap-facts">
                            <div>
                                <dt>Price</dt>
                                <dd>
                                    {formatPrice(discountedPrice(product.price, discount))}
                                    {discount > 0 && (
                                        <span className="ap-price-was">
                                            {" "}
                                            <s>{formatPrice(product.price)}</s> {discount}% off
                                        </span>
                                    )}
                                </dd>
                            </div>
                            <div>
                                <dt>Stock</dt>
                                <dd className={`ap-stock ap-stock--${stockLevel(product.quantity)}`}>{product.quantity}</dd>
                            </div>
                            <div>
                                <dt>Category</dt>
                                <dd>{product.category?.category ?? "Uncategorised"}</dd>
                            </div>
                            <div>
                                <dt>Product ID</dt>
                                <dd className="ap-id">{product.id}</dd>
                            </div>
                        </dl>

                        <button
                            type="button"
                            className="ap-btn ap-btn--primary ap-btn--block"
                            onClick={() => onAddImages({ id: product.id, productName: product.productName })}
                        >
                            <Icon name="upload" size={16} /> Add images
                        </button>
                    </>
                )}
            </aside>
        </div>
    );
}