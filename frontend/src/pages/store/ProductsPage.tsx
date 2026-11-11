import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCart } from "../../cart/cart-context";
import { BackIcon, ChevronDownIcon, NextIcon, SlidersIcon } from "../../components/store/auth/Icons";
import { ProductCard, ProductCardSkeleton } from "../../components/store/Productcard";
import { useQuery } from "../../hooks/useQuery";
import { productApi } from "../../lib/api";
import { CURRENCY } from "../../lib/config";
import { formatPrice } from "../../lib/format";
import { toView, type ProductView } from "../../lib/Homedata";
import "../../styles/product.css";

type Sort = "relevance" | "price-asc" | "price-desc" | "discount" | "name";

const SORTS: { value: Sort; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "discount", label: "Biggest discount" },
  { value: "name", label: "Name A–Z" },
];

const PAGE_SIZE = 12;
const DISCOUNTS = [0, 10, 15];
const SYMBOL =
  new Intl.NumberFormat(undefined, { style: "currency", currency: CURRENCY }).formatToParts(0).find((p) => p.type === "currency")?.value ?? CURRENCY;
const QUICK_PRICES = [
  { label: `Under ${formatPrice(500)}`, min: null, max: "500" },
  { label: `${formatPrice(500)}–${formatPrice(2000)}`, min: "500", max: "2000" },
  { label: `Above ${formatPrice(2000)}`, min: "2000", max: null },
];

function Pager({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) {
  if (pages <= 1) return null;
  const shown = [...new Set([1, pages, page - 1, page, page + 1])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  return (
    <nav className="pp-pager" aria-label="Pagination">
      <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page"><BackIcon /></button>
      {shown.map((n, i) => (
        <span key={n} className="pp-pager__item">
          {i > 0 && n - shown[i - 1] > 1 && <span aria-hidden="true">…</span>}
          <button type="button" onClick={() => onChange(n)} aria-current={n === page ? "page" : undefined} aria-label={`Page ${n}`}>{n}</button>
        </span>
      ))}
      <button type="button" onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="Next page"><NextIcon /></button>
    </nav>
  );
}

type Patch = Record<string, string | string[] | null>;

export default function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { items, add } = useCart();

  /** Adds one unit; false when the cart already holds all the stock. */
  const addToCart = (v: ProductView) => {
    if ((items.find((i) => i.productId === v.id)?.quantity ?? 0) >= v.quantity) return false;
    add(v.raw, 1);
    return true;
  };

  const q = params.get("q") ?? "";
  const selected = useMemo(() => params.getAll("category"), [params]);
  const min = params.get("min") ?? "";
  const max = params.get("max") ?? "";
  const inStockOnly = params.get("stock") === "1";
  const offersOnly = params.get("offer") === "1";
  const disc = DISCOUNTS.includes(Number(params.get("disc"))) ? Number(params.get("disc")) : 0;
  const sortParam = params.get("sort") as Sort | null;
  const sort: Sort = SORTS.some((s) => s.value === sortParam) ? (sortParam as Sort) : "relevance";

  // Name search runs on the server; every other filter runs here.
  const products = useQuery(`products:${q}`, (signal) => productApi.list(q, signal));
  const categories = useQuery("categories", () => productApi.categories());
  const source = useMemo(() => products.data ?? products.previous ?? [], [products.data, products.previous]);
  const views = useMemo(() => source.map((p) => toView(p, categories.data ?? [])), [source, categories.data]);

  /** Changes filters and returns to page 1 (unless the patch sets the page). */
  const update = (patch: Patch) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (!("page" in patch)) next.delete("page");
        for (const [key, value] of Object.entries(patch)) {
          next.delete(key);
          if (Array.isArray(value)) value.forEach((v) => next.append(key, v));
          else if (value) next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );

  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of views) if (v.category) counts.set(v.category, (counts.get(v.category) ?? 0) + 1);
    for (const name of selected) if (!counts.has(name)) counts.set(name, 0);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [views, selected]);

  const minN = min !== "" && !Number.isNaN(Number(min)) ? Number(min) : null;
  const maxN = max !== "" && !Number.isNaN(Number(max)) ? Number(max) : null;

  const results = useMemo(() => {
    const list = views.filter((v) => {
      if (selected.length && !selected.includes(v.category)) return false;
      if (minN !== null && v.finalPrice < minN) return false;
      if (maxN !== null && v.finalPrice > maxN) return false;
      if (inStockOnly && v.quantity <= 0) return false;
      if (disc > 0 && v.pct < disc) return false;
      if (offersOnly && v.pct <= 0) return false;
      return true;
    });
    switch (sort) {
      case "price-asc":
        return [...list].sort((a, b) => a.finalPrice - b.finalPrice);
      case "price-desc":
        return [...list].sort((a, b) => b.finalPrice - a.finalPrice);
      case "discount":
        return [...list].sort((a, b) => b.pct - a.pct);
      case "name":
        return [...list].sort((a, b) => a.name.localeCompare(b.name));
      default:
        return [...list].sort((a, b) => Number(b.quantity > 0) - Number(a.quantity > 0)); // in-stock first
    }
  }, [views, selected, minN, maxN, inStockOnly, disc, offersOnly, sort]);

  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(params.get("page")) || 1), pages);
  const pageItems = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleCategory = (name: string) =>
    update({ category: selected.includes(name) ? selected.filter((c) => c !== name) : [...selected, name] });

  const chips: { key: string; label: string; remove: () => void }[] = [
    ...selected.map((name) => ({ key: `c-${name}`, label: name, remove: () => toggleCategory(name) })),
  ];
  if (minN !== null || maxN !== null) {
    const label =
      minN !== null && maxN !== null ? `${formatPrice(minN)} – ${formatPrice(maxN)}` : minN !== null ? `From ${formatPrice(minN)}` : `Up to ${formatPrice(maxN ?? 0)}`;
    chips.push({ key: "price", label, remove: () => update({ min: null, max: null }) });
  }
  if (disc > 0) chips.push({ key: "disc", label: `${disc}% off or more`, remove: () => update({ disc: null }) });
  if (offersOnly) chips.push({ key: "offer", label: "On offer", remove: () => update({ offer: null }) });
  if (inStockOnly) chips.push({ key: "stock", label: "In stock only", remove: () => update({ stock: null }) });

  const clearAll = () => update({ category: null, min: null, max: null, stock: null, offer: null, disc: null });
  const related = q ? categoryOptions.map(([n]) => n).filter((n) => !selected.includes(n)).slice(0, 4) : [];
  const topPrice = Math.ceil(Math.max(0, ...views.map((v) => v.finalPrice)) / 100) * 100 || 5000;

  const title = q ? `Results for “${q}”` : selected.length === 1 ? selected[0] : offersOnly ? "Current offers" : "All products";
  const crumb = q ? "Search" : selected.length === 1 ? selected[0] : "Products";
  const firstLoad = products.loading && source.length === 0;

  return (
    <>
      <div className="hm-wide pp-page">
        <nav aria-label="Breadcrumb">
          <ol className="pp-crumbs">
            <li><Link to="/">Home</Link></li>
            <li aria-current="page">{crumb}</li>
          </ol>
        </nav>

        <header className="pp-head">
          <div>
            <h1>{title}</h1>
            <p className="pp-count" aria-live="polite">
              {firstLoad ? "Loading products…" : `${results.length} ${results.length === 1 ? "product" : "products"}`}
            </p>
          </div>
          <label className="pp-sort">
            <span>Sort by</span>
            <span className="pp-select">
              <select value={sort} onChange={(e) => update({ sort: e.target.value === "relevance" ? null : e.target.value })}>
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <ChevronDownIcon />
            </span>
          </label>
        </header>

        {related.length > 0 && (
          <div className="pp-related">
            <span>Related:</span>
            {related.map((name) => (
              <button key={name} type="button" className="pp-pill" onClick={() => update({ category: [...selected, name] })}>{name}</button>
            ))}
          </div>
        )}

        <div className="pp-listing">
          <button type="button" className="pp-pill pp-filter-toggle" aria-expanded={filtersOpen} aria-controls="product-filters" onClick={() => setFiltersOpen((o) => !o)}>
            <SlidersIcon /> Filters{chips.length ? ` (${chips.length})` : ""}
          </button>

          <aside id="product-filters" className={`pp-filters${filtersOpen ? " is-open" : ""}`} aria-label="Filters">
            <div className="pp-filters__head">
              <h2>Filters</h2>
              {chips.length > 0 && <button type="button" className="pp-link" onClick={clearAll}>Clear all</button>}
            </div>

            {categoryOptions.length > 0 && (
              <fieldset className="pp-group">
                <legend>Category</legend>
                {categoryOptions.map(([name, count]) => (
                  <label key={name} className="pp-check">
                    <input type="checkbox" checked={selected.includes(name)} onChange={() => toggleCategory(name)} />
                    <span>{name}</span>
                    <em>{count}</em>
                  </label>
                ))}
              </fieldset>
            )}

            <fieldset className="pp-group">
              <legend>Price</legend>
              <div className="pp-minmax">
                <label>
                  <span>Min ({SYMBOL})</span>
                  <input className="pp-input" type="number" inputMode="decimal" min={0} placeholder="0" value={min} onChange={(e) => update({ min: e.target.value })} />
                </label>
                <label>
                  <span>Max ({SYMBOL})</span>
                  <input className="pp-input" type="number" inputMode="decimal" min={0} placeholder={String(topPrice)} value={max} onChange={(e) => update({ max: e.target.value })} />
                </label>
              </div>
              <div className="pp-quick">
                {QUICK_PRICES.map((r) => (
                  <button key={r.label} type="button" className={`pp-pill${min === (r.min ?? "") && max === (r.max ?? "") ? " is-on" : ""}`} onClick={() => update({ min: r.min, max: r.max })}>
                    {r.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="pp-group">
              <legend>Discount</legend>
              {DISCOUNTS.map((d) => (
                <label key={d} className="pp-check">
                  <input type="radio" name="discount" checked={disc === d} onChange={() => update({ disc: d ? String(d) : null })} />
                  <span>{d ? `${d}% off or more` : "Any"}</span>
                </label>
              ))}
            </fieldset>

            <div className="pp-group pp-group--row">
              <label className="pp-check">
                <span>In stock only</span>
                <input type="checkbox" checked={inStockOnly} onChange={(e) => update({ stock: e.target.checked ? "1" : null })} />
              </label>
            </div>
          </aside>

          <section className="pp-results" aria-label="Products">
            {chips.length > 0 && (
              <ul className="pp-chips" aria-label="Active filters">
                {chips.map((c) => (
                  <li key={c.key}>
                    <button type="button" className="pp-chip" onClick={c.remove} aria-label={`Remove filter: ${c.label}`}>
                      {c.label} <span aria-hidden="true">×</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {products.error && (
              <div className="hm-alert" role="alert">
                <span>{products.error}</span>
                <button type="button" onClick={products.reload}>Try again</button>
              </div>
            )}

            {firstLoad ? (
              <ul className="pp-grid" aria-busy="true" aria-label="Loading products">
                {Array.from({ length: 8 }, (_, i) => <li key={i}><ProductCardSkeleton /></li>)}
              </ul>
            ) : pageItems.length > 0 ? (
              <div className={products.loading ? "is-refreshing" : undefined}>
                <ul className="pp-grid">
                  {pageItems.map((v) => <li key={v.id}><ProductCard product={v} onAdd={addToCart} /></li>)}
                </ul>
                <Pager
                  page={page}
                  pages={pages}
                  onChange={(n) => {
                    update({ page: n === 1 ? null : String(n) });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              </div>
            ) : (
              !products.error && (
                <div className="hm-empty">
                  <h2>No products match</h2>
                  <p>{q ? "Check the spelling or search for the start of the product name." : "Try a different category or widen the price range."}</p>
                  {chips.length > 0 && <button type="button" className="hm-btn hm-btn--outline" onClick={clearAll}>Clear filters</button>}
                </div>
              )
            )}
          </section>
        </div>
      </div>
    </>
  );
}