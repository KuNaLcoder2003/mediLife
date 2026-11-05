import { Link } from "react-router-dom";
import Icon from "../../components/store/Icon";
import { ProductGrid, ProductGridSkeleton } from "../../components/store/ProductGrid";
import SearchBar from "../../components/store/SearchBar";
import { useQuery } from "../../hooks/useQuery";
import { productApi } from "../../lib/api";
import { discountPct } from "../../lib/format";

export default function HomePage() {
  const products = useQuery("home:products", (signal) => productApi.list(undefined, signal));
  const categories = useQuery("categories", () => productApi.categories());

  const all = products.data ?? [];
  const inStock = all.filter((p) => p.quantity > 0);
  const deals = [...inStock]
    .filter((p) => discountPct(p.discount) > 0)
    .sort((a, b) => discountPct(b.discount) - discountPct(a.discount))
    .slice(0, 4);
  const featured = inStock.filter((p) => !deals.includes(p)).slice(0, 8);

  return (
    <>
      <section className="ml-hero">
        <div className="ml-container ml-hero-inner">
          <h1>Medicines and everyday health essentials, delivered to your door.</h1>
          <p>Search by product or medicine name, or browse a category.</p>
          <SearchBar variant="hero" />
          {categories.data && categories.data.length > 0 && (
            <ul className="ml-hero-cats" aria-label="Categories">
              {categories.data.slice(0, 8).map((c) => (
                <li key={c.id}>
                  <Link to={`/products?category=${encodeURIComponent(c.category)}`}>{c.category}</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="ml-container ml-home">
        {products.error && (
          <div className="ml-alert ml-alert--error" role="alert">
            <span>{products.error}</span>
            <button type="button" className="ml-link" onClick={products.reload}>
              Try again
            </button>
          </div>
        )}

        {products.loading && (
          <section className="ml-section">
            <h2>Shop essentials</h2>
            <ProductGridSkeleton count={8} />
          </section>
        )}

        {deals.length > 0 && (
          <section className="ml-section" aria-labelledby="deals-title">
            <div className="ml-section-head">
              <h2 id="deals-title">Current offers</h2>
              <Link to="/products?offer=1" className="ml-see-all">
                All offers <Icon name="forward" size={16} />
              </Link>
            </div>
            <ProductGrid products={deals} />
          </section>
        )}

        {featured.length > 0 && (
          <section className="ml-section" aria-labelledby="featured-title">
            <div className="ml-section-head">
              <h2 id="featured-title">Shop essentials</h2>
              <Link to="/products" className="ml-see-all">
                All products <Icon name="forward" size={16} />
              </Link>
            </div>
            <ProductGrid products={featured} />
          </section>
        )}

        {products.data && all.length === 0 && (
          <div className="ml-empty">
            <h2>The shelves are empty right now</h2>
            <p>Products added from the admin panel will show up here.</p>
          </div>
        )}
      </div>
    </>
  );
}
