import type { ProductView } from "../../lib/Homedata";
import { ProductCard } from "./Productcard";

export function ProductGrid({ products }: { products: ProductView[] }) {
  return (
    <ul className="ml-grid">
      {products.map((p) => (
        <li key={p.id}>
          <ProductCard product={p} onAdd={() => true} />
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
