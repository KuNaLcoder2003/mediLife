import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { formatPrice } from "../../lib/format";
import { toneOf, type ProductView } from "../../lib/Homedata";
import { HOME_CONTENT } from "../../lib/homeContent";
import CategoryIcon from "./CategoryIcon";

interface AddProps {
  product: ProductView;
  onAdd: (product: ProductView) => boolean;
  label?: string;
  variant?: "solid" | "outline";
}

export function AddToCartButton({ product, onAdd, label = "Add to cart", variant = "solid" }: AddProps) {
  const [state, setState] = useState<"idle" | "added" | "max">("idle");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const click = () => {
    setState(onAdd(product) ? "added" : "max");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 1600);
  };

  const text = state === "added" ? "Added" : state === "max" ? "All in cart" : label;
  return (
    <button type="button" className={`hm-btn hm-btn--${variant}`} onClick={click} aria-live="polite">
      {text}
    </button>
  );
}

export function ProductCard({ product, onAdd }: { product: ProductView; onAdd: AddProps["onAdd"] }) {
  const out = product.quantity <= 0;
  const low = !out && product.quantity <= HOME_CONTENT.lowStockAt;
  const to = `/products/${encodeURIComponent(product.id)}`;

  return (
    <article className="hm-card">
      <Link to={to} className={`hm-card__media hm-tone-${toneOf(product.category)}`} aria-label={product.name}>
        {product.pct > 0 && <span className="hm-badge">{Math.round(product.pct)}% off</span>}
        {product.image ? <img src={product.image} alt="" loading="lazy" /> : <span className="hm-card__icon"><CategoryIcon name={product.category} /></span>}
      </Link>
      <div className="hm-card__body">
        {product.category && <span className="hm-card__cat">{product.category}</span>}
        <h3 className="hm-card__name"><Link to={to}>{product.name}</Link></h3>
        <p className="hm-price">
          <strong>{formatPrice(product.finalPrice)}</strong>
          {product.pct > 0 && <s>{formatPrice(product.price)}</s>}
        </p>
        <p className={`hm-stock ${out ? "is-out" : low ? "is-low" : ""}`}>
          {out ? "Out of stock" : low ? `Only ${product.quantity} left` : "In stock · delivery by tomorrow"}
        </p>
        {out ? (
          <Link to={to} className="hm-btn hm-btn--muted">Notify me</Link>
        ) : (
          <AddToCartButton product={product} onAdd={onAdd} />
        )}
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="hm-card hm-skel" aria-hidden="true">
      <div className="hm-card__media" />
      <div className="hm-card__body"><i /><i /><i /><i /></div>
    </div>
  );
}