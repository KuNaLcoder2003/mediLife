import type { Product } from "../../lib/types";
import ProductCard from "./ProductCard";

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className="ml-grid">
      {products.map((p) => (
        <li key={p.id}>
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className="ml-grid" aria-busy="true" aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="ml-card ml-card--skeleton">
          <span className="ml-skel ml-skel--img" />
          <span className="ml-skel ml-skel--line" />
          <span className="ml-skel ml-skel--short" />
        </li>
      ))}
    </ul>
  );
}
