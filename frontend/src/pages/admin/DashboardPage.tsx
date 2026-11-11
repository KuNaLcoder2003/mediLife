import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertIcon, BoxIcon, ChartIcon, ClipboardIcon, DollarIcon, PlusIcon, TriangleIcon } from "../../components/store/auth/Icons";
import { adminOrderApi, productApi, type Order, type Product } from "../../lib/api";
import { fmtDate, money, plural, shortId, statusInfo } from "../../lib/orders";
import { compact, countsAsRevenue, DAY, inWindow, niceStep, pctChange, revenueOf } from "../../lib/reports";

const LOW_STOCK_LIMIT = 20;

const STATUS_ROWS = [
  { key: "pending", label: "Pending", tone: "amber" },
  { key: "confirmed", label: "Confirmed", tone: "blue" },
  { key: "shipped", label: "Shipped", tone: "purple" },
  { key: "delivered", label: "Delivered", tone: "green" },
  { key: "cancelled", label: "Cancelled", tone: "red" },
];

const availableOf = (p: Product) => p.quantity - (p.reservedQuantity ?? 0);
const dayMonth = (t: number) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [ordersError, setOrdersError] = useState("");
  const [products, setProducts] = useState<Product[] | null>(null);
  const [productsError, setProductsError] = useState("");
  const [days, setDays] = useState(30);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    adminOrderApi.list()
      .then(setOrders)
      .catch((e) => setOrdersError(e instanceof Error ? e.message : "Couldn't load orders."));
    productApi.list()
      .then(setProducts)
      .catch((e) => setProductsError(e instanceof Error ? e.message : "Couldn't load products."));
  }, []);

  const allOrders = useMemo(() => orders ?? [], [orders]);

  const from = now - days * DAY;
  const curOrders = useMemo(() => inWindow(allOrders, from, Infinity), [allOrders, from]);
  const prevOrders = useMemo(() => inWindow(allOrders, from - days * DAY, from), [allOrders, from, days]);

  const curRevenue = revenueOf(curOrders);
  const prevRevenue = revenueOf(prevOrders);
  const curPaid = curOrders.filter(countsAsRevenue).length;
  const prevPaid = prevOrders.filter(countsAsRevenue).length;
  const curAvg = curPaid ? curRevenue / curPaid : 0;
  const prevAvg = prevPaid ? prevRevenue / prevPaid : 0;

 //revenue chart
  const bucketDays = days <= 7 ? 1 : days <= 30 ? 2 : 6;
  const buckets = useMemo(() => {
    const size = bucketDays * DAY;
    return Array.from({ length: Math.ceil(days / bucketDays) }, (_, i) => {
      const start = from + i * size;
      return { start, value: revenueOf(inWindow(allOrders, start, start + size)) };
    });
  }, [allOrders, from, days, bucketDays]);
  const step = niceStep(Math.max(0, ...buckets.map((b) => b.value)));
  const topTick = step * 3;
  const ticks = [topTick, step * 2, step, 0];

  //Orders by status
  const statusRows = STATUS_ROWS.map((r) => ({ ...r, n: curOrders.filter((o) => statusInfo(o.status).tab === r.key).length }));
  const maxStatus = Math.max(1, ...statusRows.map((r) => r.n));
  const stalePending = allOrders.filter((o) => statusInfo(o.status).tab === "pending" && now - new Date(o.createdAt).getTime() > DAY).length;

  //Low stock
  const low = (products ?? []).filter((p) => availableOf(p) <= LOW_STOCK_LIMIT).sort((a, b) => availableOf(a) - availableOf(b));
  const outOfStock = low.filter((p) => availableOf(p) <= 0).length;

  const ordersReady = orders !== null;
  const waiting = ordersError ? "Couldn't load orders" : "Loading…";

  const delta = (change: number | null) => {
    if (!ordersReady) return <p className="delta">{waiting}</p>;
    if (change === null) return <p className="delta">No data in the previous period</p>;
    return (
      <p className={change >= 0 ? "delta delta--up" : "delta delta--down"}>
        <b>{change >= 0 ? "↑" : "↓"} {Math.abs(change).toFixed(1)}%</b> vs previous {days} days
      </p>
    );
  };

  const cards = [
    { label: "Revenue", value: money(curRevenue), change: pctChange(curRevenue, prevRevenue), icon: <DollarIcon />, tone: "green" },
    { label: "Orders", value: String(curOrders.length), change: pctChange(curOrders.length, prevOrders.length), icon: <ClipboardIcon />, tone: "blue" },
    { label: "Avg. order value", value: money(curAvg), change: pctChange(curAvg, prevAvg), icon: <ChartIcon />, tone: "purple" },
  ];

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Store performance for the last {days} days</p>
        </div>
        <div className="page-head__actions">
          <select className="select" value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Period">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Link to="/admin/products/new" className="btn-add"><PlusIcon /> Add product</Link>
        </div>
      </header>

            <section className="stats">
        {cards.map((c) => (
          <article key={c.label} className="card">
            <div className="stat__top"><span>{c.label}</span><span className={`bubble tone-${c.tone}`}>{c.icon}</span></div>
            <strong className="stat__value">{ordersReady ? c.value : "—"}</strong>
            {delta(c.change)}
          </article>
        ))}

        <article className="card">
          <div className="stat__top"><span>Low-stock products</span><span className="bubble tone-amber"><TriangleIcon /></span></div>
          <strong className="stat__value">{products ? String(low.length) : "—"}</strong>
          <p className="delta delta--warn">
            {products ? <><b>{outOfStock} out of stock</b>{low.length > 0 ? " · restock soon" : ""}</> : productsError || "Loading…"}
          </p>
        </article>
      </section>

      <section className="split">
        <article className="card">
          <div className="card__head">
            <div><h2>Revenue</h2><p className="muted">Excluding cancelled orders, every {plural(bucketDays, "day")}</p></div>
            <strong className="big">{ordersReady ? money(curRevenue) : "—"}</strong>
          </div>
          {!ordersReady ? (
            <p className="empty">{ordersError || "Loading…"}</p>
          ) : curOrders.length === 0 ? (
            <p className="empty">No orders in this period.</p>
          ) : (
            <>
              <div className="chart">
                <div className="chart__y">{ticks.map((t) => <span key={t}>{t === 0 ? "0" : compact(t)}</span>)}</div>
                <div className="chart__bars">
                  {buckets.map((b, i) => (
                    <span
                      key={b.start}
                      className={i === buckets.length - 1 ? "on" : ""}
                      style={{ height: `${(b.value / topTick) * 100}%` }}
                      title={`${dayMonth(b.start)}: ${money(b.value)}`}
                    />
                  ))}
                </div>
              </div>
              <div className="chart__x">{buckets.filter((_, i) => i % 2 === 0).map((b) => <span key={b.start}>{dayMonth(b.start)}</span>)}</div>
            </>
          )}
        </article>

        <article className="card">
          <div className="card__head"><h2>Orders by status</h2><Link to="/admin/orders">View orders</Link></div>
          {!ordersReady ? (
            <p className="empty">{ordersError || "Loading…"}</p>
          ) : (
            <ul className="status">
              {statusRows.map((r) => (
                <li key={r.key} className={`tone-${r.tone}`}>
                  <div><span className="dot" />{r.label}<b>{r.n.toLocaleString("en-US")}</b></div>
                  <div className="track"><span style={{ width: `${Math.max((r.n / maxStatus) * 100, 2)}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
          {stalePending > 0 && (
            <div className="warn">
              <AlertIcon />
              <p><b>{plural(stalePending, "pending order")}</b> {stalePending === 1 ? "is" : "are"} older than 24 hours. Confirm or cancel {stalePending === 1 ? "it" : "them"} to release reserved stock.</p>
            </div>
          )}
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
              {allOrders.slice(0, 5).map((o) => {
                const st = statusInfo(o.status);
                return (
                  <tr key={o.id}>
                    <td><Link to={`/admin/orders/${o.id}`}>#{shortId(o.id)}</Link></td>
                    <td>{o.customer?.name ?? "—"}</td>
                    <td>{fmtDate(o.createdAt)}</td>
                    <td><span className={`pill tone-${st.tone}`}>{st.label}</span></td>
                    <td className="r">{money(o.orderTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {ordersError && <p className="field-error">{ordersError}</p>}
          {!orders && !ordersError && <p className="empty">Loading…</p>}
          {orders && allOrders.length === 0 && <p className="empty">No orders yet.</p>}
        </article>

        <article className="card">
          <div className="card__head">
            <div><h2>Low stock</h2><p className="muted">Available = quantity − reserved</p></div>
            <Link to="/admin/products">All products</Link>
          </div>
          {productsError && <p className="field-error">{productsError}</p>}
          {!products && !productsError && <p className="empty">Loading…</p>}
          {products && low.length === 0 && <p className="empty">No products are running low.</p>}
          <ul className="low">
            {low.slice(0, 4).map((p) => {
              const left = availableOf(p);
              return (
                <li key={p.id}>
                  <span className="icon-box"><BoxIcon /></span>
                  <div><strong>{p.productName}</strong><small>Qty {p.quantity} · Reserved {p.reservedQuantity ?? 0}</small></div>
                  <span className={`pill tone-${left <= 0 ? "red" : "amber"}`}>{left <= 0 ? "Out of stock" : `${left} left`}</span>
                </li>
              );
            })}
          </ul>
        </article>
      </section>
    </>
  );
}