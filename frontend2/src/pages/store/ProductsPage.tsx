import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Icon from "../../components/store/Icon";
import { ProductGrid, ProductGridSkeleton } from "../../components/store/ProductGrid";
import { useQuery } from "../../hooks/useQuery";
import { productApi } from "../../lib/api";
import { discountPct, formatPrice, unitPrice } from "../../lib/format";

type Sort = "relevance" | "price-asc" | "price-desc" | "discount" | "name";

const SORTS: { value: Sort; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "discount", label: "Biggest discount" },
  { value: "name", label: "Name A–Z" },
];

export default function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const min = params.get("min") ?? "";
  const max = params.get("max") ?? "";
  const inStockOnly = params.get("stock") === "1";
  const offersOnly = params.get("offer") === "1";
  const sortParam = params.get("sort") as Sort | null;
  const sort: Sort = SORTS.some((s) => s.value === sortParam) ? (sortParam as Sort) : "relevance";

  // Name search runs on the server; the other filters run here.
  const products = useQuery(`products:${q}`, (signal) => productApi.list(q, signal));
  const categories = useQuery("categories", () => productApi.categories());
  const source = useMemo(() => products.data ?? products.previous ?? [], [products.data, products.previous]);

  const update = (patch: Record<string, string | null>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patch)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      },
      { replace: true },
    );

  // Category options: from the API, plus any category seen on products (in case /categories fails).
  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of source) {
      const name = p.category?.category;
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    for (const c of categories.data ?? []) if (!counts.has(c.category)) counts.set(c.category, 0);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [source, categories.data]);

  const minN = min !== "" && !Number.isNaN(Number(min)) ? Number(min) : null;
  const maxN = max !== "" && !Number.isNaN(Number(max)) ? Number(max) : null;

  const results = useMemo(() => {
    const list = source.filter((p) => {
      const price = unitPrice(p.price, p.discount);
      if (category && p.category?.category !== category) return false;
      if (minN !== null && price < minN) return false;
      if (maxN !== null && price > maxN) return false;
      if (inStockOnly && p.quantity <= 0) return false;
      if (offersOnly && discountPct(p.discount) <= 0) return false;
      return true;
    });
    const byPrice = (a: (typeof list)[number], b: (typeof list)[number]) =>
      unitPrice(a.price, a.discount) - unitPrice(b.price, b.discount);
    switch (sort) {
      case "price-asc":
        return [...list].sort(byPrice);
      case "price-desc":
        return [...list].sort((a, b) => byPrice(b, a));
      case "discount":
        return [...list].sort((a, b) => discountPct(b.discount) - discountPct(a.discount));
      case "name":
        return [...list].sort((a, b) => a.productName.localeCompare(b.productName));
      default:
        // Keep available products ahead of out-of-stock ones.
        return [...list].sort((a, b) => Number(b.quantity > 0) - Number(a.quantity > 0));
    }
  }, [source, category, minN, maxN, inStockOnly, offersOnly, sort]);

  const chips: { label: string; clear: Record<string, null> }[] = [];
  if (category) chips.push({ label: category, clear: { category: null } });
  if (minN !== null || maxN !== null)
    chips.push({
      label:
        minN !== null && maxN !== null
          ? `${formatPrice(minN)} – ${formatPrice(maxN)}`
          : minN !== null
            ? `From ${formatPrice(minN)}`
            : `Up to ${formatPrice(maxN ?? 0)}`,
      clear: { min: null, max: null },
    });
  if (inStockOnly) chips.push({ label: "In stock", clear: { stock: null } });
  if (offersOnly) chips.push({ label: "On offer", clear: { offer: null } });

  const clearAll = () => update({ category: null, min: null, max: null, stock: null, offer: null });

  const title = q ? `Results for “${q}”` : category || (offersOnly ? "Current offers" : "All products");
  const firstLoad = products.loading && source.length === 0;

  return (
    <div className="ml-container ml-listing">
      <header className="ml-listing-head">
        <div>
          <h1>{title}</h1>
          <p className="ml-muted" aria-live="polite">
            {firstLoad ? "Loading products…" : `${results.length} ${results.length === 1 ? "product" : "products"}`}
          </p>
        </div>
        <div className="ml-listing-controls">
          <button
            type="button"
            className="ml-btn ml-btn--ghost ml-filters-toggle"
            aria-expanded={filtersOpen}
            aria-controls="product-filters"
            onClick={() => setFiltersOpen((o) => !o)}
          >
            <Icon name="filter" size={16} /> Filters{chips.length ? ` (${chips.length})` : ""}
          </button>
          <label className="ml-sort">
            <span>Sort by</span>
            <select className="ml-input" value={sort} onChange={(e) => update({ sort: e.target.value === "relevance" ? null : e.target.value })}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="ml-listing-body">
        <aside id="product-filters" className={`ml-filters${filtersOpen ? " is-open" : ""}`} aria-label="Filters">
          <fieldset className="ml-filter-group">
            <legend>Category</legend>
            <label className="ml-radio">
              <input type="radio" name="category" checked={!category} onChange={() => update({ category: null })} />
              All categories
            </label>
            {categoryOptions.map(([name, count]) => (
              <label key={name} className="ml-radio">
                <input type="radio" name="category" checked={category === name} onChange={() => update({ category: name })} />
                <span className="ml-radio-label">{name}</span>
                <span className="ml-count">{count}</span>
              </label>
            ))}
          </fieldset>

          <fieldset className="ml-filter-group">
            <legend>Price</legend>
            <div className="ml-price-range">
              <label>
                <span className="ml-sr">Minimum price</span>
                <input
                  className="ml-input"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  placeholder="Min"
                  value={min}
                  onChange={(e) => update({ min: e.target.value })}
                />
              </label>
              <span aria-hidden="true">to</span>
              <label>
                <span className="ml-sr">Maximum price</span>
                <input
                  className="ml-input"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  placeholder="Max"
                  value={max}
                  onChange={(e) => update({ max: e.target.value })}
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="ml-filter-group">
            <legend>Availability</legend>
            <label className="ml-check">
              <input type="checkbox" checked={inStockOnly} onChange={(e) => update({ stock: e.target.checked ? "1" : null })} />
              In stock only
            </label>
            <label className="ml-check">
              <input type="checkbox" checked={offersOnly} onChange={(e) => update({ offer: e.target.checked ? "1" : null })} />
              On offer
            </label>
          </fieldset>

          {chips.length > 0 && (
            <button type="button" className="ml-link" onClick={clearAll}>
              Clear all filters
            </button>
          )}
        </aside>

        <section className="ml-results" aria-label="Products">
          {chips.length > 0 && (
            <ul className="ml-chips" aria-label="Active filters">
              {chips.map((chip) => (
                <li key={chip.label}>
                  <button type="button" className="ml-chip" onClick={() => update(chip.clear)} aria-label={`Remove filter: ${chip.label}`}>
                    {chip.label} <Icon name="x" size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {products.error && (
            <div className="ml-alert ml-alert--error" role="alert">
              <span>{products.error}</span>
              <button type="button" className="ml-link" onClick={products.reload}>
                Try again
              </button>
            </div>
          )}

          {firstLoad ? (
            <ProductGridSkeleton count={9} />
          ) : results.length > 0 ? (
            <div className={products.loading ? "is-refreshing" : undefined}>
              <ProductGrid products={results} />
            </div>
          ) : (
            !products.error && (
              <div className="ml-empty">
                <h2>No products match</h2>
                <p>
                  {q
                    ? "Check the spelling or search for the start of the product name."
                    : "Try a different category or widen the price range."}
                </p>
                {chips.length > 0 && (
                  <button type="button" className="ml-btn ml-btn--ghost" onClick={clearAll}>
                    Clear filters
                  </button>
                )}
              </div>
            )
          )}
        </section>
      </div>
    </div>
  );
}
