import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/auth-context";
import CancelOrderButton from "../components/store/CancelOrderButton";
import OrderStatusBadge from "../components/store/OrderStatusBadge";
import Icon from "../components/store/Icon";
import InvoiceButton from "../components/store/InvoiceButton";
import ProductImage from "../components/store/ProductImage";
import { useQuery } from "../hooks/useQuery";
import { orderApi } from "../lib/api";
import { formatDate, formatPrice, shortId } from "../lib/format";
import { canCancel } from "../lib/Order";

export default function OrderDetailPage() {
    const { orderId = "" } = useParams();
    const { user } = useAuth();
    const order = useQuery(`order:${orderId}`, () => orderApi.get(orderId));
    const [justCancelled, setJustCancelled] = useState(false);
    // Keep the page on screen while it reloads after a cancellation.
    const current = order.data ?? order.previous;

    const back = (
        <Link to="/account?tab=orders" className="ml-back-link">
            <Icon name="back" size={16} /> Your orders
        </Link>
    );

    if (order.loading && current === undefined) {
        return (
            <div className="ml-container ml-order-page" aria-busy="true">
                {back}
                <span className="ml-skel ml-skel--line" />
                <span className="ml-skel ml-skel--short" />
            </div>
        );
    }

    if (order.error && current === undefined) {
        return (
            <div className="ml-container ml-order-page">
                {back}
                <div className="ml-alert ml-alert--error" role="alert">
                    <span>{order.error}</span>
                    <button type="button" className="ml-link" onClick={order.reload}>
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    const data = current;
    // The server should also check ownership; this keeps other people's orders off screen either way.
    if (!data || (user && data.userId !== user.id)) {
        return (
            <div className="ml-container ml-order-page">
                {back}
                <div className="ml-empty">
                    <h1>We couldn't find this order</h1>
                    <p>It may belong to a different account, or the link may be wrong.</p>
                    <Link to="/account?tab=orders" className="ml-btn ml-btn--primary">
                        See your orders
                    </Link>
                </div>
            </div>
        );
    }

    const lines = data.orderedProducts;
    const units = lines.reduce((sum, l) => sum + (l.quantity ?? 1), 0);

    return (
        <div className="ml-container ml-order-page">
            {back}

            <header className="ml-order-page-head">
                <div>
                    <h1>Order #{shortId(data.id)}</h1>
                    <p className="ml-muted">Placed on {formatDate(data.createdAt)}</p>
                </div>
                <OrderStatusBadge status={data.status} />
            </header>

            {justCancelled && (
                <div className="ml-alert ml-alert--success" role="status">
                    This order has been cancelled.
                </div>
            )}

            <div className="ml-checkout-grid">
                <section className="ml-panel" aria-labelledby="order-items-title">
                    <div className="ml-panel-head">
                        <h2 id="order-items-title">
                            Items <span className="ml-muted">({units})</span>
                        </h2>
                    </div>
                    <ul className="ml-lines">
                        {lines.map((line) => (
                            <li key={line.product.id} className="ml-line ml-line--static">
                                <ProductImage src={line.product.images?.[0]?.imageUrl} alt="" className="ml-line-img" />
                                <div className="ml-line-info">
                                    <Link to={`/products/${line.product.id}`} className="ml-line-name">
                                        {line.product.productName}
                                    </Link>
                                    {line.quantity != null && line.unitPrice != null && (
                                        <span className="ml-muted ml-small">
                                            {line.quantity} × {formatPrice(line.unitPrice)}
                                        </span>
                                    )}
                                </div>
                                {line.quantity != null && line.unitPrice != null && (
                                    <span className="ml-line-total">{formatPrice(line.quantity * line.unitPrice)}</span>
                                )}
                            </li>
                        ))}
                    </ul>
                </section>

                <aside className="ml-summary" aria-labelledby="order-summary-title">
                    <h2 id="order-summary-title">Summary</h2>
                    <dl className="ml-summary-rows">
                        <div className="ml-summary-total">
                            <dt>Total</dt>
                            <dd>{formatPrice(data.orderTotal)}</dd>
                        </div>
                    </dl>

                    <div className="ml-order-meta">
                        <h3>Delivery address</h3>
                        <p>
                            {data.address.addressLine1}
                            {data.address.addressLine2 && (
                                <>
                                    <br />
                                    {data.address.addressLine2}
                                </>
                            )}
                            <br />
                            {data.address.postalCode}
                        </p>
                    </div>

                    <div className="ml-order-meta">
                        <h3>Tracking</h3>
                        <p>{data.trackingId ? <code>{data.trackingId}</code> : "Available once your order ships."}</p>
                    </div>

                    {data.status !== "CANCELLED" && <InvoiceButton order={data} variant="primary" size="md" />}
                    {canCancel(data) && (
                        <CancelOrderButton
                            order={data}
                            block
                            onCancelled={() => {
                                setJustCancelled(true);
                                order.reload();
                            }}
                        />
                    )}
                </aside>
            </div>
        </div>
    );
}