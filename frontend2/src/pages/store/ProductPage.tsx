import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCart } from "../../cart/cart-context";
import Icon from "../../components/store/Icon";
import Price from "../../components/store/Price";
import ProductImage from "../../components/store/ProductImage";
import { ProductGrid } from "../../components/store/ProductGrid";
import QuantityStepper from "../../components/store/QuantityStepper";
import StockLabel from "../../components/store/StockLabel";
import { useQuery } from "../../hooks/useQuery";
import { productApi } from "../../lib/api";
import { ApiError } from "../../lib/http";
import type { Product } from "../../lib/types";

export default function ProductPage() {
  const { productId = "" } = useParams();
  const product = useQuery(`product:${productId}`, async () => {
    try {
      return await productApi.getById(productId);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 400)) return null;
      throw err;
    }
  });

  if (product.loading) {
    return (
      <div className="ml-container ml-pdp" aria-busy="true">
        <div className="ml-pdp-grid">
          <span className="ml-skel ml-skel--hero" />
          <div>
            <span className="ml-skel ml-skel--line" />
            <span className="ml-skel ml-skel--short" />
          </div>
        </div>
      </div>
    );
  }

  if (product.error) {
    return (
      <div className="ml-container ml-pdp">
        <div className="ml-empty">
          <h1>This product couldn't be loaded</h1>
          <p>{product.error}</p>
          <button type="button" className="ml-btn ml-btn--primary" onClick={product.reload}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!product.data) {
    return (
      <div className="ml-container ml-pdp">
        <div className="ml-empty">
          <h1>We couldn't find this product</h1>
          <p>It may have been removed. Browse other products instead.</p>
          <Link to="/products" className="ml-btn ml-btn--primary">
            Browse products
          </Link>
        </div>
      </div>
    );
  }

  return <ProductDetails key={product.data.id} product={product.data} />;
}

function ProductDetails({ product }: { product: Product }) {
  const navigate = useNavigate();
  const { items, add } = useCart();
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [added, setAdded] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const images = product.images ?? [];
  const inBag = items.find((i) => i.productId === product.id)?.quantity ?? 0;
  const outOfStock = product.quantity <= 0;
  const categoryName = product.category?.category;

  const related = useQuery(categoryName ? `related:${product.id}` : null, (signal) => productApi.list(undefined, signal));
  const relatedProducts = (related.data ?? [])
    .filter((p) => p.id !== product.id && p.category?.category === categoryName && p.quantity > 0)
    .slice(0, 4);

  const addToBag = () => {
    add(product, qty);
    setAdded(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAdded(false), 1800);
  };

  const buyNow = () => {
    add(product, qty);
    navigate("/checkout");
  };

  return (
    <div className="ml-container ml-pdp">
      <nav className="ml-crumbs" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/products">Products</Link>
          </li>
          {categoryName && (
            <li>
              <Link to={`/products?category=${encodeURIComponent(categoryName)}`}>{categoryName}</Link>
            </li>
          )}
          <li aria-current="page">{product.productName}</li>
        </ol>
      </nav>

      <div className="ml-pdp-grid">
        <div className="ml-gallery">
          <ProductImage src={images[activeImage]?.imageUrl} alt={product.productName} className="ml-gallery-main" />
          {images.length > 1 && (
            <div className="ml-gallery-thumbs">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  className={i === activeImage ? "is-active" : undefined}
                  onClick={() => setActiveImage(i)}
                  aria-label={`Show image ${i + 1} of ${images.length}`}
                  aria-pressed={i === activeImage}
                >
                  <ProductImage src={img.imageUrl} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-pdp-info">
          {categoryName && <span className="ml-card-cat">{categoryName}</span>}
          <h1>{product.productName}</h1>
          <Price price={product.price} discount={product.discount} size="lg" />
          <StockLabel quantity={product.quantity} />

          {!outOfStock && (
            <div className="ml-buy">
              <div className="ml-buy-qty">
                <span id="qty-label">Quantity</span>
                <QuantityStepper value={qty} max={product.quantity} label="Quantity" onChange={setQty} />
              </div>
              <div className="ml-buy-actions">
                <button type="button" className={`ml-btn ml-btn--soft ml-btn--lg${added ? " is-done" : ""}`} onClick={addToBag}>
                  <Icon name={added ? "check" : "bag"} size={18} />
                  {added ? "Added to bag" : "Add to bag"}
                </button>
                <button type="button" className="ml-btn ml-btn--primary ml-btn--lg" onClick={buyNow}>
                  Buy now
                </button>
              </div>
              {inBag > 0 && (
                <p className="ml-muted ml-small">
                  {inBag} already in your bag. <Link to="/checkout">Go to checkout</Link>
                </p>
              )}
            </div>
          )}

          <section className="ml-pdp-desc" aria-labelledby="desc-title">
            <h2 id="desc-title">About this product</h2>
            <p>{product.productDescription}</p>
          </section>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section className="ml-section" aria-labelledby="related-title">
          <div className="ml-section-head">
            <h2 id="related-title">More in {categoryName}</h2>
          </div>
          <ProductGrid products={relatedProducts} />
        </section>
      )}
    </div>
  );
}
