import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { productApi, type Product } from "../../lib/api";
import { money } from "../../lib/orders";
import { errorMessage } from "../../lib/format";
import { ImageIcon, PencilIcon } from "../store/auth/Icons";

const LOW_STOCK_LIMIT = 20;

/** Side panel with a product's images and details (opened from the Products list). */
export default function ProductDrawer({ productId, onClose }: { productId: string; onClose: () => void }) {
  // Results are saved with the id they belong to, so a stale one never shows
  const [loaded, setLoaded] = useState<{ id: string; product?: Product; error?: string } | null>(null);
  const [active, setActive] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    productApi
      .getById(productId)
      .then((product) => !cancelled && setLoaded({ id: productId, product }))
      .catch((err) => !cancelled && setLoaded({ id: productId, error: errorMessage(err, "This product couldn't be loaded.") }));
    return () => { cancelled = true; };
  }, [productId]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const current = loaded?.id === productId ? loaded : null;
  const product = current?.product;
  const images = product?.images ?? [];
  const d = product?.discount ?? 0;
  const avail = product ? product.quantity - (product.reservedQuantity ?? 0) : 0;
  const tone = avail <= 0 ? "red" : avail <= LOW_STOCK_LIMIT ? "amber" : "green";

  return (
    <div className="drawer-wrap" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={product?.productName ?? "Product details"}
        onClick={(e) => e.stopPropagation()}>
        <header className="drawer__head">
          <h2>{product?.productName ?? "Product details"}</h2>
          <button ref={closeRef} type="button" className="icon-sq" onClick={onClose} aria-label="Close"><span aria-hidden="true">✕</span></button>
        </header>

        {current?.error && <p className="field-error">{current.error}</p>}
        {!current && <p className="empty">Loading…</p>}

        {product && (
          <>
            <div className="drawer__gallery">
              {images.length ? (
                <img className="drawer__main" src={images[Math.min(active, images.length - 1)]?.imageUrl} alt={product.productName} />
              ) : (
                <div className="drawer__main drawer__main--empty"><ImageIcon /><span>No images yet</span></div>
              )}
              {images.length > 1 && (
                <div className="drawer__thumbs">
                  {images.map((img, i) => (
                    <button key={img.id} type="button" className={i === active ? "on" : ""} onClick={() => setActive(i)} aria-label={`Show image ${i + 1}`}>
                      <img src={img.imageUrl} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {product.productDescription && <p className="drawer__desc">{product.productDescription}</p>}

            <dl className="drawer__facts">
              <div><dt>Price</dt><dd>{money(product.price * (1 - d / 100))}{d > 0 && <> <s className="was">{money(product.price)}</s> <small>{d}% off</small></>}</dd></div>
              <div><dt>Stock</dt><dd><span className={`pill tone-${tone}`}>{avail <= 0 ? "Out of stock" : `${avail} available`}</span></dd></div>
              <div><dt>Quantity / reserved</dt><dd>{product.quantity} / {product.reservedQuantity ?? 0}</dd></div>
              <div><dt>Category</dt><dd>{product.category?.category ?? "Uncategorised"}</dd></div>
              <div><dt>Product ID</dt><dd className="mono">{product.id}</dd></div>
            </dl>

            <Link to={`/admin/products/${product.id}/edit`} className="btn-add drawer__cta"><PencilIcon /> Edit product</Link>
          </>
        )}
      </aside>
    </div>
  );
}
