import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BackIcon, DotsIcon, DownloadIcon, ImageIcon, NextIcon, PencilIcon, PlusIcon, SearchIcon } from "../../components/store/auth/Icons";
import { productApi, type Product } from "../../lib/api";

const LOW_STOCK_LIMIT = 20;
const PAGE_SIZE = 8;

type Tab = "all" | "in" | "low" | "out";
const TABS: [Tab, string][] = [["all", "All"], ["in", "In stock"], ["low", "Low stock"], ["out", "Out of stock"]];

const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// Available = quantity - reserved (reserved is 0 until the backend sends it)
const available = (p: Product) => p.quantity - (p.reservedQuantity ?? 0);
const stockOf = (p: Product): Exclude<Tab, "all"> => {
  const a = available(p);
  return a <= 0 ? "out" : a <= LOW_STOCK_LIMIT ? "low" : "in";
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("default");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    productApi.list()
      .then(setProducts)
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't load products."));
  }, []);

  const all = useMemo(() => products ?? [], [products]);
  const word = q.trim().toLowerCase();

  const counts: Record<Tab, number> = {
    all: all.length,
    in: all.filter((p) => stockOf(p) === "in").length,
    low: all.filter((p) => stockOf(p) === "low").length,
    out: all.filter((p) => stockOf(p) === "out").length,
  };
  const categories = [...new Set(all.map((p) => p.category?.category).filter((c): c is string => !!c))];

  // Filter, then sort
  const rows = useMemo(() => {
    const list = all.filter(
      (p) =>
        (tab === "all" || stockOf(p) === tab) &&
        (!category || p.category?.category === category) &&
        (!word || p.productName.toLowerCase().includes(word) || p.id.toLowerCase().includes(word)),
    );
    if (sort === "name") list.sort((a, b) => a.productName.localeCompare(b.productName));
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    if (sort === "stock") list.sort((a, b) => available(a) - available(b));
    return list;
  }, [all, tab, category, word, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const view = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const from = rows.length ? (current - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(current * PAGE_SIZE, rows.length);
  const pageNumbers = Array.from({ length: pages }, (_, i) => i + 1)
    .filter((n) => n === 1 || n === pages || Math.abs(n - current) <= 1);

  // Selection
  const allOnPage = view.length > 0 && view.every((p) => selected.includes(p.id));
  const togglePage = () =>
    setSelected(allOnPage
      ? selected.filter((id) => !view.some((p) => p.id === id))
      : [...new Set([...selected, ...view.map((p) => p.id)])]);
  const toggleOne = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  // Export the selected products, or everything that matches the filters
  const exportCsv = () => {
    const list = selected.length ? all.filter((p) => selected.includes(p.id)) : rows;
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const head = ["Product ID", "Name", "Category", "Price", "Discount %", "Quantity", "Reserved", "Available"];
    const lines = list.map((p) =>
      [p.id, p.productName, p.category?.category ?? "", p.price, p.discount ?? 0, p.quantity, p.reservedQuantity ?? "", available(p)]
        .map(esc).join(","));
    const blob = new Blob([[head.map(esc).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="subbar">
        <p className="crumbs"><Link to="/admin">Dashboard</Link> / <b>Products</b></p>
        <div className="user"><span className="avatar">SA</span><strong>Store Admin</strong></div>
      </div>

      <div className="page-pad">
        <header className="page-head">
          <div>
            <h1>Products</h1>
            <p className="muted">
              {products ? `${plural(all.length, "product")} across ${plural(categories.length, "category", "categories")}` : "Loading…"}
            </p>
          </div>
          <div className="page-head__actions">
            <button type="button" className="btn-ghost" onClick={exportCsv} disabled={!products}>
              <DownloadIcon /> {selected.length ? `Export ${selected.length}` : "Export"}
            </button>
            <Link to="/admin/products/new" className="btn-add"><PlusIcon /> Add product</Link>
          </div>
        </header>

        <section className="card panel">
          <nav className="tabs">
            {TABS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={tab === key ? "tab tab--on" : "tab"}
                onClick={() => { setTab(key); setPage(1); }}
              >
                {label} <span className="tab__n">{counts[key]}</span>
              </button>
            ))}
          </nav>

          <div className="toolbar">
            <label className="search">
              <SearchIcon />
              <input
                placeholder="Search by name or product ID"
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
              />
            </label>
            <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} aria-label="Category">
              <option value="">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} aria-label="Sort by">
              <option value="default">Default order</option>
              <option value="name">Name: A to Z</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="stock">Stock: low to high</option>
            </select>
          </div>

          <div className="table-wrap">
            <table className="ptable">
              <thead>
                <tr>
                  <th className="chk"><input type="checkbox" checked={allOnPage} onChange={togglePage} aria-label="Select all on this page" /></th>
                  <th>PRODUCT</th>
                  <th>CATEGORY</th>
                  <th className="num">PRICE</th>
                  <th className="num">DISCOUNT</th>
                  <th className="num">QTY</th>
                  <th className="num">RESERVED</th>
                  <th>AVAILABLE</th>
                  <th className="num">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {view.map((p) => {
                  const a = available(p);
                  const st = stockOf(p);
                  const d = p.discount ?? 0;
                  const n = p.images?.length ?? 0;
                  const img = p.images?.[0]?.imageUrl;
                  return (
                    <tr key={p.id}>
                      <td className="chk">
                        <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleOne(p.id)} aria-label={`Select ${p.productName}`} />
                      </td>
                      <td>
                        <div className="pcell">
                          <span className="thumb">
                            <ImageIcon />
                            {img && <img src={img} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
                          </span>
                          <div>
                            <strong>{p.productName}</strong>
                            <small>#{p.id.slice(0, 8)} · {n ? plural(n, "image") : "No images"}</small>
                          </div>
                        </div>
                      </td>
                      <td>{p.category?.category ?? "—"}</td>
                      <td className="num price">
                        {money(p.price * (1 - d / 100))}
                        {d > 0 && <s className="was">{money(p.price)}</s>}
                      </td>
                      <td className="num">{d > 0 ? `${d}%` : "—"}</td>
                      <td className="num">{p.quantity}</td>
                      <td className="num">{p.reservedQuantity ?? "—"}</td>
                      <td>
                        <span className={`pill tone-${st === "in" ? "green" : st === "low" ? "amber" : "red"}`}>
                          {st === "out" ? "Out of stock" : `${a} · ${st === "in" ? "In stock" : "Low"}`}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button type="button" className="icon-sq" disabled aria-label="Edit" title="Editing needs an update endpoint on the backend"><PencilIcon /></button>
                          <button type="button" className="icon-sq" disabled aria-label="More actions" title="Needs update and delete endpoints on the backend"><DotsIcon /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {error && <tr><td colSpan={9}><p className="field-error">{error}</p></td></tr>}
                {!products && !error && <tr><td colSpan={9}><p className="empty">Loading…</p></td></tr>}
                {products && view.length === 0 && <tr><td colSpan={9}><p className="empty">No products match your filters.</p></td></tr>}
              </tbody>
            </table>
          </div>

          <div className="pager">
            <span>Showing {from}–{to} of {rows.length}</span>
            <div className="pager__nav">
              <button type="button" className="pg" disabled={current === 1} onClick={() => setPage(current - 1)} aria-label="Previous page"><BackIcon /></button>
              {pageNumbers.map((n, i) => (
                <Fragment key={n}>
                  {i > 0 && n - pageNumbers[i - 1] > 1 && <span>…</span>}
                  <button type="button" className={n === current ? "pg pg--on" : "pg"} onClick={() => setPage(n)}>{n}</button>
                </Fragment>
              ))}
              <button type="button" className="pg" disabled={current === pages} onClick={() => setPage(current + 1)} aria-label="Next page"><NextIcon /></button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}