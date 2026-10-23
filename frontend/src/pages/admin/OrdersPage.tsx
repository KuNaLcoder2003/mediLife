import { Fragment, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BackIcon, DownloadIcon, InfoIcon, NextIcon, SearchIcon } from "../../components/store/auth/Icons";
import type { Order } from "../../lib/api";
import { fmtDate, itemCount, money, PAY_INFO, plural, shortId, statusInfo, TABS, type Tab } from "../../lib/orders";

const PAGE_SIZE = 9;
const RANGES: [string, string][] = [["7", "Last 7 days"], ["30", "Last 30 days"], ["90", "Last 90 days"], ["all", "All time"]];

const BACKEND_READY = false;

export default function OrdersPage() {
  const [orders] = useState<Order[]>([]);
  const [now] = useState(() => Date.now());

  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [range, setRange] = useState("30");
  const [pay, setPay] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);

  const all = orders;
  const word = q.trim().toLowerCase();

  // Orders inside the chosen date range
  const inRange = useMemo(
    () => (range === "all" ? all : all.filter((o) => now - new Date(o.createdAt).getTime() <= Number(range) * 86_400_000)),
    [all, range, now],
  );

  const counts = Object.fromEntries(
    TABS.map(([key]) => [key, key === "all" ? inRange.length : inRange.filter((o) => statusInfo(o.status).tab === key).length]),
  ) as Record<Tab, number>;

  const rows = useMemo(
    () =>
      inRange.filter(
        (o) =>
          (tab === "all" || statusInfo(o.status).tab === tab) &&
          (!pay || o.payment?.status === pay) &&
          (!word || o.id.toLowerCase().includes(word) || (o.trackingId ?? "").toLowerCase().includes(word)),
        // later: also search by customer name and email once the endpoint returns them
      ),
    [inRange, tab, pay, word],
  );

  // Pagination (the server sends everything at once)
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const view = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const from = rows.length ? (current - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(current * PAGE_SIZE, rows.length);
  const pageNumbers = Array.from({ length: pages }, (_, i) => i + 1)
    .filter((n) => n === 1 || n === pages || Math.abs(n - current) <= 1);

  // Selection
  const allOnPage = view.length > 0 && view.every((o) => selected.includes(o.id));
  const togglePage = () =>
    setSelected(allOnPage
      ? selected.filter((id) => !view.some((o) => o.id === id))
      : [...new Set([...selected, ...view.map((o) => o.id)])]);
  const toggleOne = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const exportCsv = () => {
    const list = selected.length ? all.filter((o) => selected.includes(o.id)) : rows;
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const head = ["Order ID", "Placed", "Customer", "Items", "Payment", "Status", "Tracking ID", "Total"];
    const lines = list.map((o) =>
      [o.id, o.createdAt, "", itemCount(o), o.payment ? (PAY_INFO[o.payment.status]?.label ?? o.payment.status) : "", statusInfo(o.status).label, o.trackingId ?? "", o.orderTotal]
        .map(esc).join(","));
    const blob = new Blob([[head.map(esc).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "orders.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const rangeLabel = range === "all" ? "in total" : `in the last ${range} days`;

  return (
    <>
      <div className="subbar">
        <p className="crumbs"><Link to="/admin">Dashboard</Link> / <b>Orders</b></p>
        <div className="user"><span className="avatar">SA</span><strong>Store Admin</strong></div>
      </div>

      <div className="page-pad">
        <header className="page-head">
          <div>
            <h1>Orders</h1>
            <p className="muted">
              {BACKEND_READY ? `${plural(inRange.length, "order")} ${rangeLabel}` : "Waiting for backend data"}
            </p>
          </div>
          <div className="page-head__actions">
            <button type="button" className="btn-ghost" onClick={exportCsv} disabled={!BACKEND_READY || all.length === 0}>
              <DownloadIcon /> {selected.length ? `Export ${selected.length}` : "Export"}
            </button>
          </div>
        </header>

        <section className="card panel">
          {!BACKEND_READY && (
            <div className="notice notice--flat">
              <InfoIcon />
              <p>Store-wide orders will appear here once the backend has an admin orders endpoint. The layout is ready for that data.</p>
            </div>
          )}

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
                placeholder="Order ID, tracking ID or customer"
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
              />
            </label>
            <select value={range} onChange={(e) => { setRange(e.target.value); setPage(1); }} aria-label="Date range">
              {RANGES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
            <select value={pay} onChange={(e) => { setPay(e.target.value); setPage(1); }} aria-label="Payment status">
              <option value="">All payments</option>
              {Object.entries(PAY_INFO).map(([v, info]) => <option key={v} value={v}>{info.label}</option>)}
            </select>
          </div>

          {selected.length > 0 && (
            <div className="selbar">
              <strong>{plural(selected.length, "order")} selected</strong>
              <div>
                <button type="button" className="btn-ghost" onClick={exportCsv}>Export selected</button>
                <button type="button" className="btn-primary" disabled title="Needs an admin endpoint to change order status">Mark as confirmed</button>
              </div>
            </div>
          )}

          <div className="table-wrap">
            <table className="ptable">
              <thead>
                <tr>
                  <th className="chk"><input type="checkbox" checked={allOnPage} onChange={togglePage} aria-label="Select all on this page" /></th>
                  <th>ORDER</th>
                  <th>CUSTOMER</th>
                  <th>SHIP TO</th>
                  <th className="num">ITEMS</th>
                  <th>PAYMENT</th>
                  <th>STATUS</th>
                  <th>TRACKING ID</th>
                  <th className="num">TOTAL</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {view.map((o) => {
                  const st = statusInfo(o.status);
                  const pinfo = o.payment ? PAY_INFO[o.payment.status] : undefined;
                  return (
                    <tr key={o.id}>
                      <td className="chk">
                        <input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggleOne(o.id)} aria-label={`Select order ${shortId(o.id)}`} />
                      </td>
                      <td>
                        <Link className="oid" to={`/admin/orders/${o.id}`}>#{shortId(o.id)}</Link>
                        <small className="sub">{fmtDate(o.createdAt)}</small>
                      </td>
                      <td>
                        {/* later: show the customer's name and phone or email from the admin endpoint */}
                        —
                      </td>
                      <td>
                        {o.address ? <><span>{o.address.addressLine1}</span><small className="sub">{o.address.postalCode}</small></> : "—"}
                      </td>
                      <td className="num">{itemCount(o)}</td>
                      <td>
                        {o.payment ? <span className={`paytext tone-${pinfo?.tone ?? "grey"}`}>{pinfo?.label ?? o.payment.status}</span> : "—"}
                      </td>
                      <td><span className={`pill tone-${st.tone}`}>{st.label}</span></td>
                      <td className="mono">{o.trackingId || "—"}</td>
                      <td className="num price">{money(o.orderTotal)}</td>
                      <td>
                        <div className="row-actions">
                          <Link className="icon-sq" to={`/admin/orders/${o.id}`} aria-label={`Open order ${shortId(o.id)}`}><NextIcon /></Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {all.length === 0 && (
                  <tr>
                    <td colSpan={10}>
                      <p className="empty">
                        {BACKEND_READY ? "No orders yet. New orders will show up here." : "Orders will show up here once the backend endpoint is connected."}
                      </p>
                    </td>
                  </tr>
                )}
                {all.length > 0 && view.length === 0 && (
                  <tr><td colSpan={10}><p className="empty">No orders match your filters.</p></td></tr>
                )}
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