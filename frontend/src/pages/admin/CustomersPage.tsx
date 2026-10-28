import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BackIcon, DownloadIcon, InfoIcon, NextIcon, SearchIcon } from "../../components/store/auth/Icons";
import { adminOrderApi, ApiError, customerApi, type Customer, type Order } from "../../lib/api";
import { initials, statsByCustomer } from "../../lib/customers";
import { fmtDate, money, plural } from "../../lib/orders";
import { downloadCsv } from "../../lib/reports";

const PAGE_SIZE = 10;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([customerApi.list(), adminOrderApi.list()])
      .then(([c, o]) => { setCustomers(c); setOrders(o); })
      .catch((e) => {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) setNeedsLogin(true);
        else setError(e instanceof Error ? e.message : "Couldn't load customers.");
      });
  }, []);

  const all = useMemo(() => customers ?? [], [customers]);
  const stats = useMemo(() => statsByCustomer(orders), [orders]);
  const hasOrders = orders.length > 0;
  const word = q.trim().toLowerCase();
  const withoutAddress = all.filter((c) => c.addresses.length === 0).length;

  const rows = useMemo(() => {
    const list = all.filter(
      (c) =>
        (filter === "all" || (filter === "address" ? c.addresses.length > 0 : c.addresses.length === 0)) &&
        (!word ||
          c.name.toLowerCase().includes(word) ||
          c.email.toLowerCase().includes(word) ||
          (c.mobile ?? "").toLowerCase().includes(word) ||
          c.id.toLowerCase().includes(word)),
    );
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "orders") list.sort((a, b) => (stats.get(b.id)?.orders ?? 0) - (stats.get(a.id)?.orders ?? 0));
    if (sort === "spent") list.sort((a, b) => (stats.get(b.id)?.spent ?? 0) - (stats.get(a.id)?.spent ?? 0));
    return list;
  }, [all, filter, word, sort, stats]);

  // Pagination (the server sends everyone at once)
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const view = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const from = rows.length ? (current - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(current * PAGE_SIZE, rows.length);
  const pageNumbers = Array.from({ length: pages }, (_, i) => i + 1)
    .filter((n) => n === 1 || n === pages || Math.abs(n - current) <= 1);

  // Selection
  const allOnPage = view.length > 0 && view.every((c) => selected.includes(c.id));
  const togglePage = () =>
    setSelected(allOnPage
      ? selected.filter((id) => !view.some((c) => c.id === id))
      : [...new Set([...selected, ...view.map((c) => c.id)])]);
  const toggleOne = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const exportCsv = () => {
    const list = selected.length ? all.filter((c) => selected.includes(c.id)) : rows;
    downloadCsv("customers.csv", [
      ["ID", "Name", "Email", "Mobile", "Addresses", "Orders", "Total spent"],
      ...list.map((c) => [
        c.id,
        c.name,
        c.email,
        c.mobile ?? "",
        c.addresses.map((a) => [a.addressLine1, a.addressLine2, a.postalCode].filter(Boolean).join(", ")).join(" | "),
        hasOrders ? (stats.get(c.id)?.orders ?? 0) : "",
        hasOrders ? (stats.get(c.id)?.spent ?? 0) : "",
      ]),
    ]);
  };

  return (
    <>
      <div className="subbar">
        <p className="crumbs"><Link to="/admin">Dashboard</Link> / <b>Customers</b></p>
        <div className="user"><span className="avatar">SA</span><strong>Store Admin</strong></div>
      </div>

      <div className="page-pad">
        <header className="page-head">
          <div>
            <h1>Customers</h1>
            <p className="muted">
              {customers
                ? `${plural(all.length, "customer")}${withoutAddress > 0 ? ` · ${withoutAddress} without an address` : ""}`
                : "Loading…"}
            </p>
          </div>
          <div className="page-head__actions">
            <button type="button" className="btn-ghost" onClick={exportCsv} disabled={!customers}>
              <DownloadIcon /> {selected.length ? `Export ${selected.length}` : "Export"}
            </button>
          </div>
        </header>

        {needsLogin ? (
          <section className="card">
            <h2 className="card-title">Sign in as an admin to see customers</h2>
            <p className="muted">The customers list is protected, and no valid admin session was found.</p>
            <Link to="/login" className="btn-add">Go to sign in</Link>
          </section>
        ) : (
          <section className="card panel">
            {customers && !hasOrders && (
              <div className="notice notice--flat">
                <InfoIcon />
                <p>Orders, total spent and last order will fill in once the backend has an admin orders endpoint.</p>
              </div>
            )}

            <div className="toolbar">
              <label className="search">
                <SearchIcon />
                <input
                  placeholder="Search by name, email, phone or ID"
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setPage(1); }}
                />
              </label>
              <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }} aria-label="Address filter">
                <option value="all">All customers</option>
                <option value="address">With an address</option>
                <option value="none">Without an address</option>
              </select>
              <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} aria-label="Sort by">
                <option value="name">Name: A to Z</option>
                <option value="orders">Most orders</option>
                <option value="spent">Highest spend</option>
              </select>
            </div>

            <div className="table-wrap">
              <table className="ptable">
                <thead>
                  <tr>
                    <th className="chk"><input type="checkbox" checked={allOnPage} onChange={togglePage} aria-label="Select all on this page" /></th>
                    <th>CUSTOMER</th>
                    <th>PHONE</th>
                    <th>ADDRESS</th>
                    <th className="num">ORDERS</th>
                    <th className="num">TOTAL SPENT</th>
                    <th>LAST ORDER</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {view.map((c) => {
                    const s = stats.get(c.id);
                    const first = c.addresses[0];
                    return (
                      <tr key={c.id}>
                        <td className="chk">
                          <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleOne(c.id)} aria-label={`Select ${c.name}`} />
                        </td>
                        <td>
                          <Link to={`/admin/customers/${c.id}`} className="cust">
                            <span className="avatar avatar--blue">{initials(c.name)}</span>
                            <span>
                              <strong>{c.name}</strong>
                              <small>{c.email}</small>
                            </span>
                          </Link>
                        </td>
                        <td>{c.mobile || "—"}</td>
                        <td>
                          {first ? (
                            <>
                              <span>{first.addressLine1}</span>
                              <small className="sub">{first.postalCode}{c.addresses.length > 1 ? ` · +${c.addresses.length - 1} more` : ""}</small>
                            </>
                          ) : (
                            <span className="muted-cell">No address</span>
                          )}
                        </td>
                        <td className="num">{hasOrders ? (s?.orders ?? 0) : "—"}</td>
                        <td className="num price">{hasOrders ? money(s?.spent ?? 0) : "—"}</td>
                        <td>{s?.last ? fmtDate(s.last) : "—"}</td>
                        <td>
                          <div className="row-actions">
                            <Link className="icon-sq" to={`/admin/customers/${c.id}`} aria-label={`Open ${c.name}`}><NextIcon /></Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {error && <tr><td colSpan={8}><p className="field-error">{error}</p></td></tr>}
                  {!customers && !error && <tr><td colSpan={8}><p className="empty">Loading…</p></td></tr>}
                  {customers && all.length === 0 && <tr><td colSpan={8}><p className="empty">No customers yet.</p></td></tr>}
                  {customers && all.length > 0 && view.length === 0 && <tr><td colSpan={8}><p className="empty">No customers match your search.</p></td></tr>}
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
        )}
      </div>
    </>
  );
}