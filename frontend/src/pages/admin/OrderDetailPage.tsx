import { Link, useParams } from "react-router-dom";
import { AlertIcon, CheckIcon, ImageIcon, InfoIcon, PrinterIcon } from "../../components/store/auth/Icons";
import type { Order } from "../../lib/api";
import { fmtDate, fmtLong, money, PAY_INFO, shortId, STATUS_INFO, statusInfo } from "../../lib/orders";

const STEPS = ["Pending", "Confirmed", "Shipped", "Delivered"];
const STEP_OF: Record<string, number> = { CREATED: 0, CONFIRMED: 1, PACKING: 1, SHIPPED: 2, DISPATCHED: 2, DELIVERED: 3 };
const BACKEND_READY = false;

export default function OrderDetailPage() {
  const { orderId = "" } = useParams();

  const order: Order = { id: orderId, userId: "", trackingId: "", orderTotal: 0, createdAt: "", orderedProducts: [] };

  const bar = (
    <div className="subbar">
      <p className="crumbs"><Link to="/admin/orders">Orders</Link> / <b>#{shortId(orderId)}</b></p>
      <div className="user"><span className="avatar">SA</span><strong>Store Admin</strong></div>
    </div>
  );

  const st = statusInfo(order.status);
  const idx = order.status ? STEP_OF[order.status] : undefined;
  const stopped = order.status === "CANCELLED" || order.status === "RETURNED";
  const changed = !!order.updatedAt && Math.abs(new Date(order.updatedAt).getTime() - new Date(order.createdAt).getTime()) > 5000;

  const lines = order.orderedProducts.map((l) => {
    const qty = l.quantity ?? 1;
    return { l, qty, total: l.unitPrice === undefined ? undefined : l.unitPrice * qty };
  });
  const subtotal = lines.length && lines.every((x) => x.total !== undefined) ? lines.reduce((s, x) => s + (x.total ?? 0), 0) : undefined;
  const pinfo = order.payment ? PAY_INFO[order.payment.status] : undefined;

  return (
    <>
      {bar}
      <div className="page-pad">
        <header className="page-head">
          <div>
            <h1>Order #{shortId(order.id)} <span className={`pill tone-${st.tone} pill--lg`}>{st.label}</span></h1>
            <p className="muted">
              {BACKEND_READY ? <>Placed {fmtLong(order.createdAt)}{changed && <> · Last updated {fmtDate(order.updatedAt)}</>}</> : "Waiting for backend data"}
            </p>
          </div>
          <div className="page-head__actions">
            <button type="button" className="btn-ghost" onClick={() => window.print()} disabled={!BACKEND_READY}><PrinterIcon /> Print invoice</button>
            <button
              type="button"
              className="btn-danger"
              disabled
              title="Disabled until the backend cancel handler is fixed: it currently restocks a fixed 3 units per item"
            >
              Cancel order
            </button>
          </div>
        </header>

        {!BACKEND_READY && (
          <div className="notice notice--flat">
            <InfoIcon />
            <p>Order details will appear here once the backend has an admin endpoint for orders. The layout is ready for that data.</p>
          </div>
        )}

        {stopped ? (
          <div className="issue" role="status">
            <AlertIcon />
            <div><p><b>This order was {st.label.toLowerCase()}.</b></p></div>
          </div>
        ) : idx !== undefined ? (
          <section className="card">
            <ol className="steps-track">
              {STEPS.map((label, i) => (
                <li key={label} className={i < idx ? "done" : i === idx ? "now" : ""}>
                  <span className="dot-step">{i < idx ? <CheckIcon /> : null}</span>
                  <strong>{label}</strong>
                  <small>{i === 0 ? fmtDate(order.createdAt) : i <= idx ? (changed ? fmtDate(order.updatedAt) : "Done") : "Not yet"}</small>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <div className="order-grid">
          <div className="stack">
            <section className="card panel">
              <h2 className="card-title pad">Items{BACKEND_READY && <span className="muted"> ({lines.length})</span>}</h2>
              <ul className="lines">
                {lines.map(({ l, qty, total }) => {
                  const img = l.product.images?.[0]?.imageUrl;
                  return (
                    <li key={l.product.id}>
                      <span className="thumb thumb--lg">
                        <ImageIcon />
                        {img && <img src={img} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
                      </span>
                      <div className="lines__name">
                        <strong>{l.product.productName}</strong>
                        <small>#{shortId(l.product.id)} · Qty {qty}</small>
                      </div>
                      <strong className="lines__total">{total === undefined ? "—" : money(total)}</strong>
                    </li>
                  );
                })}
                {lines.length === 0 && <li><p className="empty">The items in this order will show up here.</p></li>}
              </ul>
              <div className="totals">
                <div><span>Items subtotal</span><span>{subtotal === undefined ? "—" : money(subtotal)}</span></div>
                <div className="totals__main"><span>Order total</span><span>{BACKEND_READY ? money(order.orderTotal) : "—"}</span></div>
              </div>
            </section>

            <section className="card">
              <h2 className="card-title">Fulfilment</h2>
              <p className="muted">Update the status as the order moves. The customer is notified on every change.</p>
              <div className="row">
                <div className="field">
                  <label htmlFor="o-status">Order status</label>
                  <select id="o-status" className="input" disabled value={order.status ?? ""}>
                    {!order.status && <option value="">—</option>}
                    {Object.entries(STATUS_INFO).map(([value, info]) => <option key={value} value={value}>{info.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="o-track">Tracking ID</label>
                  <input id="o-track" className="input mono" disabled value={order.trackingId ?? ""} placeholder="e.g. DLV4421987763" readOnly />
                </div>
              </div>
              <div className="notice notice--flat">
                <InfoIcon />
                <p>The backend has no endpoint to change an order’s status or tracking ID yet, so this form is read-only for now.</p>
              </div>
              <div className="save-row"><button type="button" className="btn-primary" disabled>Save changes</button></div>
            </section>
          </div>

          <aside className="stack">
            <section className="card">
              <div className="card__head"><h3 className="eyebrow">Customer</h3></div>
              <p className="muted">Customer details will appear here once the backend sends them.</p>
            </section>

            <section className="card">
              <h3 className="eyebrow">Shipping address</h3>
              {order.address ? (
                <address className="addr">
                  <span>{order.address.addressLine1}</span>
                  {order.address.addressLine2 && <span>{order.address.addressLine2}</span>}
                  <span>{order.address.postalCode}</span>
                </address>
              ) : (
                <p className="muted">The shipping address will appear here.</p>
              )}
              <p className="field-hint">City, state and country aren't stored with addresses yet.</p>
            </section>

            <section className="card">
              <div className="card__head">
                <h3 className="eyebrow">Payment</h3>
                {order.payment && <span className={`pill tone-${pinfo?.tone ?? "grey"}`}>{pinfo?.label ?? order.payment.status}</span>}
              </div>
              {order.payment ? (
                <dl className="auto">
                  <div><dt>Amount</dt><dd>{money(order.orderTotal)}</dd></div>
                  <div><dt>Transaction ID</dt><dd className="mono">{order.payment.stripeID || "—"}</dd></div>
                </dl>
              ) : (
                <p className="muted">Payment details will appear here.</p>
              )}
            </section>

            <section className="card">
              <h3 className="eyebrow">Activity</h3>
              {BACKEND_READY ? (
                <ul className="activity">
                  {changed && <li><span className="bullet" /><div><strong>Status: {st.label}</strong><small>{fmtDate(order.updatedAt)}</small></div></li>}
                  <li><span className="bullet" /><div><strong>Order placed on the website</strong><small>{fmtDate(order.createdAt)}</small></div></li>
                </ul>
              ) : (
                <p className="muted">The order’s history will appear here.</p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}