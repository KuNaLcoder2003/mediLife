import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../../cart/cart-context";
import type { Product } from "../../lib/types";
import Icon from "./Icon";
import Price from "./Price";
import ProductImage from "./ProductImage";

export default function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const outOfStock = product.quantity <= 0;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const handleAdd = () => {
    add(product, 1);
    setAdded(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <article className="ml-card">
      <Link to={`/products/${product.id}`} className="ml-card-link">
        <ProductImage src={product.images?.[0]?.imageUrl} alt="" className="ml-card-img" />
        <div className="ml-card-body">
          {product.category?.category && <span className="ml-card-cat">{product.category.category}</span>}
          <h3 className="ml-card-title">{product.productName}</h3>
          <Price price={product.price} discount={product.discount} size="sm" />
        </div>
      </Link>
      <div className="ml-card-foot">
        {outOfStock ? (
          <span className="ml-stock ml-stock--out">Out of stock</span>
        ) : (
          <button type="button" className={`ml-btn ml-btn--soft ml-btn--sm ml-btn--block${added ? " is-done" : ""}`} onClick={handleAdd}>
            <Icon name={added ? "check" : "plus"} size={16} />
            {added ? "Added to bag" : "Add to bag"}
          </button>
        )}
      </div>
    </article>
  );
}
