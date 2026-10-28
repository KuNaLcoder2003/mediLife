import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminOrderApi, ApiError, customerApi, type Customer, type Order } from "../../lib/api";
import { initials } from "../../lib/customers";
import { fmtDate, itemCount, money, plural, shortId, statusInfo } from "../../lib/orders";
import { countsAsRevenue, revenueOf } from "../../lib/reports";

export default function CustomerDetailPage() {
  const { customerId = "" } = useParams();
  const [customer, setCustomer] = useState<Customer | null | undefined>(undefined); // undefined = loading
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);

  useEffect(() => {
    Promise.all([customerApi.list(), adminOrderApi.list()])
      .then(([list, o]) => {
        setCustomer(list.find((c) => c.id === customerId) ?? null);
        setOrders(o);
      })
      .catch((e) => {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) setNeedsLogin(true);
        else setError(e instanceof Error ? e.message : "Couldn't load this customer.");
      });
  }, [customerId]);

  const hasOrders = orders.length > 0;
  const mine = useMemo(
    () => orders.filter((o) => o.userId === customerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [orders, customerId],
  );
  const spent = revenueOf(mine);
  const paid = mine.filter(countsAsRevenue).length;

  const bar = (
    <div className="subbar">
      <p className="crumbs"><Link to="/admin/customers">Customers</Link> / <b>{customer ? customer.name : "Customer"}</b></p>
      <div className="user"><span className="avatar">SA</span><strong>Store Admin</strong></div>
    </div>
  );

  if (needsLogin) {
    return (
      <>
        {bar}
        <div className="page-pad">
          <section className="card">
            <h2 className="card-title">Sign in as an admin to see this customer</h2>
            <p className="muted">Customer details are protected, and no valid admin session was found.</p>
            <Link to="/login" className="btn-add">Go to sign in</Link>
          </section>
        </div>
      </>
    );
  }
  if (error) return <>{bar}<div className="page-pad"><p className="field-error">{error}</p></div></>;
  if (customer === undefined) return <>{bar}<div className="page-pad"><p className="empty">Loading…</p></div></>;
  if (customer === null) {
    return (
      <>
        {bar}
        <div className="page-pad">
          <h1>Customer not found</h1>
          <p className="muted">There is no customer with this ID.</p>
          <Link to="/admin/customers">Back to customers</Link>
        </div>
      </>
    );
  }

  const stats = [
    { label: "Orders", value: hasOrders ? String(mine.length) : "—" },
    { label: "Total spent", value: hasOrders ? money(spent) : "—" },
    { label: "Average order", value: hasOrders ? (paid ? money(spent / paid) : money(0)) : "—" },
    { label: "Last order", value: mine[0] ? fmtDate(mine[0].createdAt) : "—" },
  ];

  return (
    <>
      {bar}
      <div className="page-pad">
        <header className="page-head">
          <div className="who who--lg">
            <span className="avatar avatar--blue">{initials(customer.name)}</span>
            <div>
              <h1>{customer.name}</h1>
              <p className="muted">{customer.email}</p>
            </div>
          </div>
          <div className="page-head__actions">
            <a className="btn-ghost" href={`mailto:${customer.email}`}>Email customer</a>
          </div>
        </header>

        <section className="stats">
          {stats.map((s) => (
            <article key={s.label} className="card">
              <span className="stat__label">{s.label}</span>
              <strong className="stat__value">{s.value}</strong>
              <p className="delta">{hasOrders ? "" : "Waiting for orders data"}</p>
            </article>
          ))}
        </section>

        <div className="order-grid">
          <section className="card">
            <div className="card__head">
              <h2>Order history</h2>
              <Link to="/admin/orders">All orders</Link>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>ORDER</th><th>PLACED</th><th className="r">ITEMS</th><th>STATUS</th><th className="r">TOTAL</th></tr>
                </thead>
                <tbody>
                  {mine.map((o) => {
                    const st = statusInfo(o.status);
                    return (
                      <tr key={o.id}>
                        <td><Link className="oid" to={`/admin/orders/${o.id}`}>#{shortId(o.id)}</Link></td>
                        <td>{fmtDate(o.createdAt)}</td>
                        <td className="r">{itemCount(o)}</td>
                        <td><span className={`pill tone-${st.tone}`}>{st.label}</span></td>
                        <td className="r">{money(o.orderTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {mine.length === 0 && (
              <p className="empty">
                {hasOrders ? "This customer hasn't placed any orders yet." : "Order history will appear once the backend has an admin orders endpoint."}
              </p>
            )}
          </section>

          <aside className="stack">
            <section className="card">
              <h3 className="eyebrow">Contact</h3>
              <a className="contact" href={`mailto:${customer.email}`}>{customer.email}</a>
              {customer.mobile ? <p className="contact contact--plain">{customer.mobile}</p> : <p className="muted">No phone number saved.</p>}
            </section>

            <section className="card">
              <div className="card__head">
                <h3 className="eyebrow">Addresses</h3>
                <span className="count-pill">{plural(customer.addresses.length, "address", "addresses")}</span>
              </div>
              {customer.addresses.length === 0 ? (
                <p className="muted">This customer hasn't saved an address yet.</p>
              ) : (
                <ul className="addr-list">
                  {customer.addresses.map((a, i) => (
                    <li key={`${a.postalCode}-${a.addressLine1}-${i}`}>
                      <small>Address {i + 1}</small>
                      <address className="addr">
                        <span>{customer.name}</span>
                        <span>{a.addressLine1}</span>
                        {a.addressLine2 && <span>{a.addressLine2}</span>}
                        <span>{a.postalCode}</span>
                      </address>
                    </li>
                  ))}
                </ul>
              )}
              <p className="field-hint">City, state and country aren't stored with addresses yet.</p>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}