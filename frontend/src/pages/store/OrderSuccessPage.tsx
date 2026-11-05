import type { ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/auth-context";
import Icon from "../../components/store/Icon";
import InvoiceButton from "../../components/store/InvoiceButton";
import ProductImage from "../../components/store/ProductImage";
import { useQuery } from "../../hooks/useQuery";
import { orderApi } from "../../lib/api";
import { firstName, formatDate, formatPrice, shortId } from "../../lib/format";


export default function OrderSuccessPage() {
    const [params] = useSearchParams();
    const orderId = (params.get("orderId") ?? "").trim();
    const { user } = useAuth();
    const order = useQuery(orderId ? `success:${orderId}` : null, () => orderApi.get(orderId));

    if (!orderId) {
        return (
            <Shell>
                <Missing title="We couldn't find your order">
                    This page needs an order to show. You can find all your orders in your account.
                </Missing>
            </Shell>
        );
    }

    if (order.loading) {
        return (
            <Shell busy>
                <div className="ml-confirm-head">
                    <span className="ml-spinner ml-spinner--lg" aria-hidden="true" />
                    <h1>Loading your order…</h1>
                </div>
            </Shell>
        );
    }

    if (order.error) {
        return (
            <Shell>
                <div className="ml-empty">
                    <h1>Your order details couldn't be loaded</h1>
                    <p>{order.error} Your order isn't affected. You can also find it in your account.</p>
                    <div className="ml-confirm-actions ml-confirm-actions--start">
                        <button type="button" className="ml-btn ml-btn--primary" onClick={order.reload}>
                            Try again
                        </button>
                        <Link to="/account?tab=orders" className="ml-btn ml-btn--ghost">
                            See your orders
                        </Link>
                    </div>
                </div>
            </Shell>
        );
    }

    const data = order.data;
    if (!data) {
        return (
            <Shell>
                <Missing title="We couldn't find this order">
                    It may belong to a different account, or the link may be incomplete.
                </Missing>
            </Shell>
        );
    }

    const lines = data.orderedProducts ?? [];
    const units = lines.reduce((sum, line) => sum + (line.quantity ?? 1), 0);
    const cancelled = data.status === "CANCELLED";
    const name = firstName(user?.name);

    return (
        <Shell>
            <header className="ml-confirm-head" role="status">
                <span className={`ml-success-icon${cancelled ? " ml-success-icon--muted" : ""}`}>
                    <Icon name={cancelled ? "alert" : "check"} size={30} />
                </span>
                <h1>{cancelled ? "This order was cancelled" : "Order confirmed"}</h1>
                <p>
                    {cancelled
                        ? "Nothing will be shipped for this order."
                        : `${name ? `Thanks, ${name}. ` : "Thank you. "}We're getting your order ready.`}
                </p>
                <p className="ml-confirm-ref">
                    Order #{shortId(data.id)}
                    <span aria-hidden="true"> · </span>
                    Placed {formatDate(data.createdAt)}
                </p>
            </header>

            <section className="ml-panel" aria-labelledby="confirm-items-title">
                <div className="ml-panel-head">
                    <h2 id="confirm-items-title">
                        Items <span className="ml-muted">({units})</span>
                    </h2>
                </div>

                <ul className="ml-lines">
                    {lines.map((line) => {
                        const priced = line.quantity != null && line.unitPrice != null;
                        return (
                            <li key={line.product.id} className="ml-line ml-line--static">
                                <ProductImage src={line.product.images?.[0]?.imageUrl} alt="" className="ml-line-img" />
                                <div className="ml-line-info">
                                    <Link to={`/products/${line.product.id}`} className="ml-line-name">
                                        {line.product.productName}
                                    </Link>
                                    {priced && (
                                        <span className="ml-muted ml-small">
                                            {line.quantity} × {formatPrice(line.unitPrice!)}
                                        </span>
                                    )}
                                </div>
                                {priced && <span className="ml-line-total">{formatPrice(line.quantity! * line.unitPrice!)}</span>}
                            </li>
                        );
                    })}
                </ul>

                <dl className="ml-confirm-total">
                    <dt>{cancelled ? "Order total" : "Total paid"}</dt>
                    <dd>{formatPrice(data.orderTotal)}</dd>
                </dl>

                <div className="ml-confirm-meta">
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
                    {!cancelled && (
                        <div className="ml-order-meta">
                            <h3>Tracking</h3>
                            <p>
                                {data.trackingId ? (
                                    <code>{data.trackingId}</code>
                                ) : (
                                    "We'll add a tracking number to your order as soon as it ships."
                                )}
                            </p>
                        </div>
                    )}
                </div>
            </section>

            <div className="ml-confirm-actions">
                <Link to={`/account/orders/${data.id}`} className="ml-btn ml-btn--primary">
                    View order
                </Link>
                {!cancelled && <InvoiceButton order={data} size="md" />}
                <Link to="/products" className="ml-btn ml-btn--ghost">
                    Continue shopping
                </Link>
            </div>
        </Shell>
    );
}

function Shell({ children, busy }: { children: ReactNode; busy?: boolean }) {
    return (
        <div className="ml-container ml-confirm" aria-busy={busy || undefined}>
            {children}
        </div>
    );
}

function Missing({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="ml-empty">
            <h1>{title}</h1>
            <p>{children}</p>
            <div className="ml-confirm-actions ml-confirm-actions--start">
                <Link to="/account?tab=orders" className="ml-btn ml-btn--primary">
                    See your orders
                </Link>
                <Link to="/products" className="ml-btn ml-btn--ghost">
                    Continue shopping
                </Link>
            </div>
        </div>
    );
}