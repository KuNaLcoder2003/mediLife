import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlusIcon, DollarIcon, ClipboardIcon, ChartIcon, TriangleIcon, BoxIcon } from "../../components/store/auth/Icons";
import { productApi, type Product } from "../../lib/api";

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");


const LOW_STOCK_LIMIT = 20;

// Cards that still need a backend endpoint show "—" instead of fake numbers.
const STATS = [
  { label: "Revenue", value: "—", icon: <DollarIcon />, tone: "green", kind: "up", delta: "", note: "Waiting for backend data" },
  { label: "Orders", value: "—", icon: <ClipboardIcon />, tone: "blue", kind: "up", delta: "", note: "Waiting for backend data" },
  { label: "Avg. order value", value: "—", icon: <ChartIcon />, tone: "purple", kind: "down", delta: "", note: "Waiting for backend data" },
  { label: "Low-stock products", value: "—", icon: <TriangleIcon />, tone: "amber", kind: "warn", delta: "", note: "" },
];

// These stay empty until the backend can send them.
const BARS: number[] = [];
const LABELS: string[] = [];
const STATUS: [string, number][] = [];
type Row = { id: string; customer: string; placed: string; status: string; total: number };
const ORDERS: Row[] = [];

const TONE: Record<string, string> = { Pending: "amber", Confirmed: "blue", Shipped: "purple", Delivered: "green", Cancelled: "red" };

export default function DashboardPage() {
  const max = Math.max(1, ...STATUS.map(([, n]) => n));

  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    productApi
      .list()
      .then(setProducts)
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't load products."));
  }, []);

  const low = (products ?? [])
    .filter((p) => p.quantity <= LOW_STOCK_LIMIT)
    .sort((a, b) => a.quantity - b.quantity);
  const outOfStock = low.filter((p) => p.quantity <= 0).length;

  const stats = STATS.map((s) =>
    s.label === "Low-stock products"
      ? {
        ...s,
        value: products ? String(low.length) : "—",
        delta: products ? `${outOfStock} out of stock` : "",
        note: products && low.length > 0 ? "· restock soon" : "",
      }
      : s,
  );

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Store performance for the last 30 days</p>
        </div>
        <div className="page-head__actions">
          <select className="select">
            <option>Last 30 days</option><option>Last 7 days</option><option>Last 90 days</option>
          </select>
          <Link to="/admin/products/new" className="btn-add"><PlusIcon /> Add product</Link>
        </div>
      </header>

      <section className="stats">
        {stats.map((s) => (
          <article key={s.label} className="card">
            <div className="stat__top"><span>{s.label}</span><span className={`bubble tone-${s.tone}`}>{s.icon}</span></div>
            <strong className="stat__value">{s.value}</strong>
            <p className={`delta delta--${s.kind}`}><b>{s.delta}</b> {s.note}</p>
          </article>
        ))}
      </section>

      <section className="split">
        <article className="card">
          <div className="card__head">
            <div><h2>Revenue</h2><p className="muted">Paid orders, every 2 days</p></div>
            <strong className="big">—</strong>
          </div>
          {BARS.length === 0 ? (
            <p className="empty">Revenue data isn't available yet.</p>
          ) : (
            <>
              <div className="chart">
                <div className="chart__y"><span>₹45k</span><span>₹30k</span><span>₹15k</span><span>0</span></div>
                <div className="chart__bars">
                  {BARS.map((v, i) => (
                    <span key={i} className={i === BARS.length - 1 ? "on" : ""} style={{ height: `${(v / 45) * 100}%` }} />
                  ))}
                </div>
              </div>
              <div className="chart__x">{LABELS.map((l) => <span key={l}>{l}</span>)}</div>
            </>
          )}
        </article>

        <article className="card">
          <div className="card__head"><h2>Orders by status</h2><Link to="/admin/orders">View orders</Link></div>
          {STATUS.length === 0 && <p className="empty">Order data isn't available yet.</p>}
          <ul className="status">
            {STATUS.map(([label, n]) => (
              <li key={label} className={`tone-${TONE[label]}`}>
                <div><span className="dot" />{label}<b>{n.toLocaleString("en-IN")}</b></div>
                <div className="track"><span style={{ width: `${Math.max((n / max) * 100, 2)}%` }} /></div>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="split">
        <article className="card">
          <div className="card__head"><h2>Recent orders</h2><Link to="/admin/orders">View all</Link></div>
          <table className="table">
            <thead>
              <tr><th>ORDER</th><th>CUSTOMER</th><th>PLACED</th><th>STATUS</th><th className="r">TOTAL</th></tr>
            </thead>
            <tbody>
              {ORDERS.map((o) => (
                <tr key={o.id}>
                  <td><Link to={`/admin/orders/${o.id}`}>#{o.id}</Link></td>
                  <td>{o.customer}</td>
                  <td>{o.placed}</td>
                  <td><span className={`pill tone-${TONE[o.status]}`}>{o.status}</span></td>
                  <td className="r">{inr(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {ORDERS.length === 0 && <p className="empty">No orders to show yet.</p>}
        </article>

        <article className="card">
          <div className="card__head">
            <div><h2>Low stock</h2><p className="muted">Products with {LOW_STOCK_LIMIT} or fewer units left</p></div>
            <Link to="/admin/products">All products</Link>
          </div>
          {error && <p className="field-error">{error}</p>}
          {!products && !error && <p className="empty">Loading…</p>}
          {products && low.length === 0 && <p className="empty">No products are running low.</p>}
          <ul className="low">
            {low.slice(0, 4).map((p) => (
              <li key={p.id}>
                <span className="icon-box"><BoxIcon /></span>
                <div><strong>{p.productName}</strong><small>Qty {p.quantity}</small></div>
                <span className={`pill tone-${p.quantity <= 0 ? "red" : "amber"}`}>
                  {p.quantity <= 0 ? "Out of stock" : `${p.quantity} left`}
                </span>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </>
  );
}