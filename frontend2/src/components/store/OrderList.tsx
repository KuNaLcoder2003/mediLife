import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "../../hooks/useQuery";
import { orderApi } from "../../lib/api";
import { canCancel } from "../../lib/Order";
import { formatDate, formatPrice, shortId } from "../../lib/format";
import type { Order } from "../../lib/types";
import Icon from "./Icon";
import ProductImage from "./ProductImage";
import InvoiceButton from "./InvoiceButton";
import CancelOrderButton from "./CancelOrderButton";
import OrderStatusBadge from "./OrderStatusBadge";

function itemSummary(order: Order): string {
    const names = order.orderedProducts.map((l) => l.product.productName);
    if (names.length === 0) return "No items";
    if (names.length === 1) return names[0]!;
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
}

export default function OrdersList() {
    const orders = useQuery("orders", () => orderApi.list());
    const [notice, setNotice] = useState<string | null>(null);

    // Keep showing the last list while it reloads (e.g. after a cancellation).
    const current = orders.data ?? orders.previous;

    if (orders.loading && !current) {
        return (
            <div className="ml-orders" aria-busy="true" aria-label="Loading orders">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="ml-order-card ml-order-card--skeleton">
                        <span className="ml-skel ml-skel--line" />
                        <span className="ml-skel ml-skel--short" />
                    </div>
                ))}
            </div>
        );
    }

    if (orders.error && !current) {
        return (
            <div className="ml-alert ml-alert--error" role="alert">
                <span>{orders.error}</span>
                <button type="button" className="ml-link" onClick={orders.reload}>
                    Try again
                </button>
            </div>
        );
    }

    const list = current ?? [];

    if (list.length === 0) {
        return (
            <div className="ml-empty ml-empty--flush">
                <h2>No orders yet</h2>
                <p>When you place an order, it will show up here with its invoice.</p>
                <Link to="/products" className="ml-btn ml-btn--primary">
                    Start shopping
                </Link>
            </div>
        );
    }

    return (
        <>
            {notice && (
                <div className="ml-alert ml-alert--success" role="status">
                    {notice}
                </div>
            )}
            {orders.error && (
                <div className="ml-alert ml-alert--error" role="alert">
                    <span>{orders.error}</span>
                    <button type="button" className="ml-link" onClick={orders.reload}>
                        Try again
                    </button>
                </div>
            )}
            <ul className={`ml-orders${orders.loading ? " is-refreshing" : ""}`} aria-label="Your orders">
                {list.map((order) => {
                    const thumbs = order.orderedProducts.slice(0, 4);
                    const extra = order.orderedProducts.length - thumbs.length;
                    return (
                        <li key={order.id} className="ml-order-card">
                            <div className="ml-order-head">
                                <div>
                                    <h3>
                                        <Link to={`/account/orders/${order.id}`}>Order #{shortId(order.id)}</Link>
                                    </h3>
                                    <span className="ml-muted ml-small">Placed {formatDate(order.createdAt)}</span>
                                </div>
                                <OrderStatusBadge status={order.status} />
                            </div>

                            <div className="ml-order-body">
                                <div className="ml-order-thumbs" aria-hidden="true">
                                    {thumbs.map((line) => (
                                        <ProductImage key={line.product.id} src={line.product.images?.[0]?.imageUrl} alt="" className="ml-order-thumb" />
                                    ))}
                                    {extra > 0 && <span className="ml-order-thumb ml-order-more">+{extra}</span>}
                                </div>
                                <p className="ml-order-items">{itemSummary(order)}</p>
                                <span className="ml-order-total">{formatPrice(order.orderTotal)}</span>
                            </div>

                            <div className="ml-order-actions">
                                <Link to={`/account/orders/${order.id}`} className="ml-btn ml-btn--ghost ml-btn--sm">
                                    View details <Icon name="forward" size={15} />
                                </Link>
                                {order.status !== "CANCELLED" && <InvoiceButton order={order} />}
                                {canCancel(order) && (
                                    <span className="ml-order-actions-end">
                                        <CancelOrderButton
                                            order={order}
                                            onCancelled={(cancelled) => {
                                                setNotice(`Order #${shortId(cancelled.id)} has been cancelled.`);
                                                orders.reload();
                                            }}
                                        />
                                    </span>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </>
    );
}