import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DownloadIcon, InfoIcon } from "../../components/store/auth/Icons";
import { OrderApi, productApi, type Order, type Product } from "../../lib/api"; //OrderApi
import { money, STATUS_INFO } from "../../lib/orders";
import {
  byCategory, compact, DAY, downloadCsv, inWindow, monthlySeries, niceStep,
  pctChange, productMap, summarize, topProducts,
} from "../../lib/reports";

type TabKey = "sales" | "products" | "orders" | "inventory";
const TABS: [TabKey, string][] = [["sales", "Sales"], ["products", "Products"], ["orders", "Orders"], ["inventory", "Inventory"]];
const RANGES: [string, string][] = [["30", "Last 30 days"], ["90", "Last 90 days"], ["180", "Last 6 months"], ["365", "Last 12 months"], ["all", "All time"]];
const LOW_STOCK_LIMIT = 20;

const availableOf = (p: Product) => p.quantity - (p.reservedQuantity ?? 0);
const shortDate = (t: number) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const longDate = (t: number) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function ReportsPage() {
  const [orders] = useState<Order[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabKey>("sales");
  const [range, setRange] = useState("180");
  const [now] = useState(() => Date.now());

  useEffect(() => {
  productApi.list()
    .then(setProducts)
    .catch((e) =>
      setError(e instanceof Error ? e.message : "Couldn't load products.")
    );
}, []);

  const allOrders = useMemo(() => orders ?? [], [orders]);
  const allProducts = useMemo(() => products ?? [], [products]);
  const byId = useMemo(() => productMap(allProducts), [allProducts]);
  const loading = !orders || !products;
  const hasOrders = allOrders.length > 0;

  //ssales and Orders
  const days = range === "all" ? null : Number(range);
  const from = days ? now - days * DAY : 0;
  const prevFrom = days ? now - 2 * days * DAY : 0;

  const curOrders = useMemo(() => inWindow(allOrders, from, Infinity), [allOrders, from]);
  const prevOrders = useMemo(() => (days ? inWindow(allOrders, prevFrom, from) : []), [allOrders, days, prevFrom, from]);
  const cur = useMemo(() => summarize(curOrders, byId), [curOrders, byId]);
  const prev = useMemo(() => summarize(prevOrders, byId), [prevOrders, byId]);
  const months = useMemo(() => monthlySeries(allOrders, now), [allOrders, now]);
  const categories = useMemo(() => byCategory(curOrders, byId), [curOrders, byId]);
  const top = useMemo(() => topProducts(curOrders, byId), [curOrders, byId]);
  const statusCounts = useMemo(
    () => Object.entries(STATUS_INFO).map(([key, info]) => ({ key, ...info, n: curOrders.filter((o) => o.status === key).length })),
    [curOrders],
  );

  //Products and Inventory
  const stock = useMemo(() => {
    const out = allProducts.filter((p) => availableOf(p) <= 0).length;
    const low = allProducts.filter((p) => availableOf(p) > 0 && availableOf(p) <= LOW_STOCK_LIMIT).length;
    return {
      units: allProducts.reduce((s, p) => s + p.quantity, 0),
      value: allProducts.reduce((s, p) => s + p.quantity * p.price, 0),
      out,
      low,
      lowest: [...allProducts].sort((a, b) => availableOf(a) - availableOf(b)).slice(0, 8),
    };
  }, [allProducts]);

  const catalog = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of allProducts) {
      const c = p.category?.category ?? "Uncategorised";
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return {
      list: [...counts.entries()].sort((a, b) => b[1] - a[1]),
      avg: allProducts.length ? allProducts.reduce((s, p) => s + p.price, 0) / allProducts.length : 0,
      discounted: allProducts.filter((p) => (p.discount ?? 0) > 0).length,
    };
  }, [allProducts]);

  // Chart scale
  const maxV = Math.max(0, ...months.flatMap((m) => [m.cur, m.prev]));
  const step = niceStep(maxV);
  const topTick = step * 3;
  const ticks = [topTick, step * 2, step, 0];
  const year = new Date(now).getFullYear();

  //Header text
  const subtitle =
    tab === "sales"
      ? days ? `${shortDate(from)} – ${longDate(now)} · compared with the previous period` : "All time"
      : tab === "orders"
        ? days ? `${shortDate(from)} – ${longDate(now)}` : "All time"
        : "Current stock and catalog";

  const exportCsv = () => {
    if (tab === "sales") {
      downloadCsv("sales-report.csv", [
        ["Metric", "Current period", "Previous period"],
        ["Net revenue", cur.revenue, prev.revenue],
        ["Orders", cur.count, prev.count],
        ["Discounts given", cur.discounts, prev.discounts],
        ["Cancellation rate %", cur.cancelRate.toFixed(1), prev.cancelRate.toFixed(1)],
        [],
        ["Category", "Net revenue", "Share %"],
        ...categories.map((c) => [c.name, c.amount, c.share.toFixed(1)]),
        [],
        ["Rank", "Product", "Category", "Orders", "Net revenue", "Available"],
        ...top.map((r, i) => [i + 1, r.name, r.category, r.orders, r.revenue, r.available ?? ""]),
      ]);
    } else if (tab === "products") {
      downloadCsv("products-report.csv", [["Category", "Products"], ...catalog.list.map(([name, n]) => [name, n])]);
    } else if (tab === "orders") {
      downloadCsv("orders-report.csv", [["Status", "Orders"], ...statusCounts.map((s) => [s.label, s.n])]);
    } else {
      downloadCsv("inventory-report.csv", [
        ["Product", "Category", "Quantity", "Reserved", "Available"],
        ...allProducts.map((p) => [p.productName, p.category?.category ?? "", p.quantity, p.reservedQuantity ?? "", availableOf(p)]),
      ]);
    }
  };

  
  const plainCards = (items: { label: string; value: string; note?: string }[]) => (
    <section className="stats">
      {items.map((i) => (
        <article key={i.label} className="card">
          <span className="stat__label">{i.label}</span>
          <strong className="stat__value">{i.value}</strong>
          <p className="delta">{i.note ?? ""}</p>
        </article>
      ))}
    </section>
  );

  const salesCards = [
    { label: "Net revenue", value: money(cur.revenue), change: pctChange(cur.revenue, prev.revenue), upIsGood: true, pts: false },
    { label: "Orders", value: cur.count.toLocaleString("en-US"), change: pctChange(cur.count, prev.count), upIsGood: true, pts: false },
    { label: "Discounts given", value: money(cur.discounts), change: pctChange(cur.discounts, prev.discounts), upIsGood: false, pts: false },
    { label: "Cancellation rate", value: `${cur.cancelRate.toFixed(1)}%`, change: prev.count ? cur.cancelRate - prev.cancelRate : null, upIsGood: false, pts: true },
  ];

  const deltaLine = (c: (typeof salesCards)[number]) => {
    if (!hasOrders) return <p className="delta">Waiting for orders data</p>;
    if (!days) return <p className="delta">All time</p>;
    if (c.change === null) return <p className="delta">No data in the previous period</p>;
    const flat = c.change === 0;
    const fine = (c.change > 0) === c.upIsGood;
    return (
      <p className={flat ? "delta" : fine ? "delta delta--up" : "delta delta--down"}>
        <b>{flat ? "–" : c.change > 0 ? "↑" : "↓"} {Math.abs(c.change).toFixed(1)}{c.pts ? " pts" : "%"}</b> vs previous period
      </p>
    );
  };

  const maxStatus = Math.max(1, ...statusCounts.map((s) => s.n));
  const maxCat = Math.max(1, ...catalog.list.map(([, n]) => n));

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Reports</h1>
          <p className="muted">{subtitle}</p>
        </div>
        <div className="page-head__actions">
          {(tab === "sales" || tab === "orders") && (
            <select className="select" value={range} onChange={(e) => setRange(e.target.value)} aria-label="Date range">
              {RANGES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          )}
          <button type="button" className="btn-add" onClick={exportCsv} disabled={loading}><DownloadIcon /> Export CSV</button>
        </div>
      </header>

      <div className="seg" role="tablist" aria-label="Report type">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? "seg__on" : ""} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {error && <p className="field-error">{error}</p>}
      {!loading && !hasOrders && (tab === "sales" || tab === "orders") && (
        <div className="notice notice--top">
          <InfoIcon />
          <p>Sales and order numbers will fill in once the backend has an admin orders endpoint. The Products and Inventory tabs already use live data.</p>
        </div>
      )}

      {tab === "sales" && (
        <>
          <section className="stats">
            {salesCards.map((c) => (
              <article key={c.label} className="card">
                <span className="stat__label">{c.label}</span>
                <strong className="stat__value">{hasOrders ? c.value : "—"}</strong>
                {deltaLine(c)}
              </article>
            ))}
          </section>

          <section className="split">
            <article className="card">
              <div className="card__head">
                <div><h2>Monthly net revenue</h2><p className="muted">Excluding cancelled orders</p></div>
                <div className="legend">
                  <span><i className="lg lg--cur" /> {year}</span>
                  <span><i className="lg lg--prev" /> {year - 1}</span>
                </div>
              </div>
              {!hasOrders ? (
                <p className="empty">Revenue data isn't available yet.</p>
              ) : (
                <div className="gchart">
                  <div className="gchart__y">{ticks.map((t) => <span key={t}>{t === 0 ? "0" : compact(t)}</span>)}</div>
                  <div className="gchart__plot">
                    {months.map((m) => (
                      <div key={m.key} className="gchart__group">
                        <div className="gchart__bars">
                          <span className="bar-prev" style={{ height: `${(m.prev / topTick) * 100}%` }} />
                          <span className="bar-cur" style={{ height: `${(m.cur / topTick) * 100}%` }} />
                        </div>
                        <div className="gchart__label" title={m.partial ? "Month to date" : undefined}>
                          <b>{m.label}{m.partial ? "*" : ""}</b>
                          <small>{compact(m.cur)}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>

            <article className="card">
              <div className="card__head"><div><h2>Revenue by category</h2><p className="muted">Share of net revenue</p></div></div>
              {categories.length === 0 ? (
                <p className="empty">No category data yet.</p>
              ) : (
                <ul className="status">
                  {categories.slice(0, 6).map((c) => (
                    <li key={c.name} className="tone-green">
                      <div>{c.name}<b>{money(c.amount)} <span className="pct">· {Math.round(c.share)}%</span></b></div>
                      <div className="track"><span style={{ width: `${Math.max(c.share, 2)}%` }} /></div>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>

          <section className="card">
            <div className="card__head">
              <div><h2>Top products</h2><p className="muted">Ranked by net revenue</p></div>
              <Link to="/admin/products">Manage products</Link>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>#</th><th>PRODUCT</th><th>CATEGORY</th><th className="r">ORDERS</th><th className="r">NET REVENUE</th><th className="r">AVAILABLE</th></tr>
                </thead>
                <tbody>
                  {top.map((r, i) => (
                    <tr key={r.id}>
                      <td>{i + 1}</td>
                      <td><strong>{r.name}</strong></td>
                      <td className="cat">{r.category}</td>
                      <td className="r">{r.orders.toLocaleString("en-US")}</td>
                      <td className="r">{money(r.revenue)}</td>
                      <td className="r">{r.available ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {top.length === 0 && <p className="empty">No sales data yet.</p>}
          </section>
        </>
      )}

      {tab === "products" && (
        <>
          {plainCards([
            { label: "Total products", value: loading ? "—" : String(allProducts.length) },
            { label: "Categories", value: loading ? "—" : String(catalog.list.length) },
            { label: "Average price", value: loading ? "—" : money(catalog.avg) },
            { label: "Products on discount", value: loading ? "—" : String(catalog.discounted) },
          ])}
          <section className="card">
            <div className="card__head"><div><h2>Products by category</h2><p className="muted">Number of products in each category</p></div><Link to="/admin/products">Manage products</Link></div>
            {catalog.list.length === 0 ? (
              <p className="empty">{loading ? "Loading…" : "No products yet."}</p>
            ) : (
              <ul className="status">
                {catalog.list.map(([name, n]) => (
                  <li key={name} className="tone-green">
                    <div>{name}<b>{n}</b></div>
                    <div className="track"><span style={{ width: `${Math.max((n / maxCat) * 100, 2)}%` }} /></div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {tab === "orders" && (
        <>
          {plainCards([
            { label: "Orders", value: hasOrders ? cur.count.toLocaleString("en-US") : "—", note: hasOrders ? "" : "Waiting for orders data" },
            { label: "Average order value", value: hasOrders && cur.count ? money(cur.revenue / Math.max(1, curOrders.filter((o) => o.status !== "CANCELLED" && o.status !== "RETURNED").length)) : "—" },
            { label: "Delivered", value: hasOrders ? String(curOrders.filter((o) => o.status === "DELIVERED").length) : "—" },
            { label: "Cancelled", value: hasOrders ? String(curOrders.filter((o) => o.status === "CANCELLED").length) : "—" },
          ])}
          <section className="card">
            <div className="card__head"><h2>Orders by status</h2><Link to="/admin/orders">View orders</Link></div>
            {!hasOrders ? (
              <p className="empty">Order data isn't available yet.</p>
            ) : (
              <ul className="status">
                {statusCounts.map((s) => (
                  <li key={s.key} className={`tone-${s.tone}`}>
                    <div><span className="dot" />{s.label}<b>{s.n.toLocaleString("en-US")}</b></div>
                    <div className="track"><span style={{ width: `${Math.max((s.n / maxStatus) * 100, 2)}%` }} /></div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {tab === "inventory" && (
        <>
          {plainCards([
            { label: "Units in stock", value: loading ? "—" : stock.units.toLocaleString("en-US") },
            { label: "Inventory value", value: loading ? "—" : money(stock.value), note: "Quantity × price" },
            { label: "Low stock", value: loading ? "—" : String(stock.low), note: `${LOW_STOCK_LIMIT} or fewer available` },
            { label: "Out of stock", value: loading ? "—" : String(stock.out) },
          ])}
          <section className="card">
            <div className="card__head"><div><h2>Lowest stock</h2><p className="muted">Available = quantity − reserved</p></div><Link to="/admin/products">All products</Link></div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>PRODUCT</th><th>CATEGORY</th><th className="r">QTY</th><th className="r">RESERVED</th><th className="r">AVAILABLE</th><th>STATUS</th></tr>
                </thead>
                <tbody>
                  {stock.lowest.map((p) => {
                    const a = availableOf(p);
                    return (
                      <tr key={p.id}>
                        <td><strong>{p.productName}</strong></td>
                        <td className="cat">{p.category?.category ?? "—"}</td>
                        <td className="r">{p.quantity}</td>
                        <td className="r">{p.reservedQuantity ?? "—"}</td>
                        <td className="r">{a}</td>
                        <td><span className={`pill tone-${a <= 0 ? "red" : a <= LOW_STOCK_LIMIT ? "amber" : "green"}`}>{a <= 0 ? "Out of stock" : a <= LOW_STOCK_LIMIT ? "Low" : "In stock"}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {stock.lowest.length === 0 && <p className="empty">{loading ? "Loading…" : "No products yet."}</p>}
          </section>
        </>
      )}
    </>
  );
}