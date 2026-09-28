import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/auth-context";
import { useCart } from "../../cart/cart-context";
import AddressForm from "../../components/store/AddressForm";
import FullPageLoader from "../../components/store/FullPageLoader";
import Icon from "../../components/store/Icon";
import ProductImage from "../../components/store/ProductImage";
import QuantityStepper from "../../components/store/QuantityStepper";
import { useQuery } from "../../hooks/useQuery";
import { orderApi, productApi } from "../../lib/api";
import { errorMessage, formatPrice, unitPrice } from "../../lib/format";
import { ApiError } from "../../lib/http";
import type { Address, Product } from "../../lib/types";
import { useRealtime } from "../../lib/realtime-context";

interface OrderSummary {
  total: number;
  units: number;
  address: Address | undefined;
}

/**
 * idle -> placing (POST /newOrder) -> waiting (for the WebSocket) -> redirecting (to the payment page)
 * Anything that goes wrong lands back on idle with `orderError` set.
 */
type PaymentState =
  | { kind: "idle" }
  | { kind: "placing"; summary: OrderSummary }
  | { kind: "waiting"; summary: OrderSummary; orderId?: string; message: string }
  | { kind: "redirecting"; summary: OrderSummary; url: string };

const SLOW_AFTER_MS = 30_000;

/** Only follow links that are real web URLs (never javascript: etc.). */
function safePaymentUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol === "https:") return url.toString();
    if (url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) return url.toString();
  } catch {
    /* not a URL */
  }
  return null;
}

const formatAddress = (a: Address) => [a.addressLine1, a.addressLine2, a.postalCode].filter(Boolean).join(", ");

export default function CheckoutPage() {
  const { user, reloadUser } = useAuth();
  const cart = useCart();
  const realtime = useRealtime();

  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [payment, setPayment] = useState<PaymentState>({ kind: "idle" });
  const [orderError, setOrderError] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const placing = payment.kind !== "idle";

  // Which order we're waiting on. Set synchronously in payNow so a WebSocket
  // message that arrives before the HTTP response still gets matched.
  const pendingRef = useRef<{ orderId?: string } | null>(null);

  // Re-check price and stock for everything in the bag whenever its contents change.
  const ids = cart.items
    .map((i) => i.productId)
    .sort()
    .join(",");
  const stock = useQuery(ids ? `stock:${ids}` : null, async () => {
    const list = ids.split(",");
    const results = await Promise.allSettled(list.map((id) => productApi.getById(id)));
    const fresh: Product[] = [];
    const unavailable: string[] = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value) {
        fresh.push(r.value);
        if (r.value.quantity <= 0) unavailable.push(r.value.id);
      } else {
        unavailable.push(list[i] as string);
      }
    });
    cart.sync(fresh);
    return new Set(unavailable);
  });

  const { clear: clearCart } = cart;
  const reloadStock = stock.reload;

  // Payment link / inventory notifications for the order being placed.
  useEffect(
    () =>
      realtime.subscribe((message) => {
        const pending = pendingRef.current;
        if (!pending) return;
        if (message.type !== "PAYMENT_LINK_CREATED" && message.type !== "INVENTORY_UNAVAILABLE") return;
        if (message.orderId && pending.orderId && message.orderId !== pending.orderId) return;

        pendingRef.current = null;

        if (message.type === "PAYMENT_LINK_CREATED") {
          const url = safePaymentUrl(message.paymentUrl);
          if (!url) {
            setPayment({ kind: "idle" });
            setOrderError("We received an invalid payment link. Please contact support before trying again.");
            return;
          }
          clearCart();
          setPayment((p) => (p.kind === "idle" ? p : { kind: "redirecting", summary: p.summary, url }));
        } else {
          setPayment({ kind: "idle" });
          setOrderError(
            message.message ??
            "Some items went out of stock while we confirmed your order. Update your bag and try again.",
          );
          reloadStock();
        }
      }),
    [realtime, clearCart, reloadStock],
  );

  // Send the user to the payment page as soon as the link is ready.
  useEffect(() => {
    if (payment.kind === "redirecting") window.location.assign(payment.url);
  }, [payment]);

  // Reassure the user if the payment link takes a while.
  useEffect(() => {
    if (payment.kind !== "waiting") return;
    const id = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => window.clearTimeout(id);
  }, [payment.kind]);

  if (!user) return <FullPageLoader label="Loading your details…" />;

  /* ---------- Waiting for / following the payment link ---------- */
  if (payment.kind === "waiting" || payment.kind === "redirecting") {
    const { summary } = payment;
    const redirecting = payment.kind === "redirecting";
    return (
      <div className="ml-container ml-checkout">
        <div className="ml-success" role="status" aria-live="polite">
          {redirecting ? (
            <span className="ml-success-icon">
              <Icon name="check" size={28} />
            </span>
          ) : (
            <span className="ml-spinner ml-spinner--lg" aria-hidden="true" />
          )}
          <h1>{redirecting ? "Taking you to payment" : "Preparing your payment"}</h1>
          <p>
            {redirecting
              ? "Your payment page is opening."
              : "Your order is confirmed. We're creating a secure payment link, which usually takes a few seconds."}
          </p>
          {slow && !redirecting && (
            <p className="ml-notice">
              This is taking longer than usual. Keep this page open and the payment page will open as soon as it's ready.
            </p>
          )}
          <dl className="ml-success-facts">
            <div>
              <dt>Items</dt>
              <dd>{summary.units}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd>{formatPrice(summary.total)}</dd>
            </div>
            {summary.address && (
              <div>
                <dt>Delivering to</dt>
                <dd>{formatAddress(summary.address)}</dd>
              </div>
            )}
          </dl>
          {redirecting && (
            <a href={payment.url} className="ml-btn ml-btn--primary">
              Continue to payment
            </a>
          )}
        </div>
      </div>
    );
  }

  /* ---------- Empty bag ---------- */
  if (cart.items.length === 0) {
    return (
      <div className="ml-container ml-checkout">
        <div className="ml-empty">
          <h1>Your bag is empty</h1>
          <p>Add products to your bag, then come back here to check out.</p>
          <Link to="/products" className="ml-btn ml-btn--primary">
            Browse products
          </Link>
        </div>
      </div>
    );
  }

  const addresses = user.addresses;
  const addressId =
    selectedAddress && addresses.some((a) => a.id === selectedAddress) ? selectedAddress : (addresses[0]?.id ?? null);
  const address = addresses.find((a) => a.id === addressId);

  const unavailable = stock.data ?? new Set<string>();
  const hasUnavailable = cart.items.some((i) => unavailable.has(i.productId));

  const mrp = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const total = cart.items.reduce((sum, i) => sum + unitPrice(i.price, i.discount) * i.quantity, 0);
  const savings = mrp - total;

  const blocker = !addressId
    ? "Add a delivery address to continue."
    : hasUnavailable
      ? "Remove unavailable items to continue."
      : stock.loading
        ? "Checking stock…"
        : realtime.status === "offline"
          ? "Can't reach the payment service. Retrying…"
          : realtime.status !== "ready"
            ? "Connecting to the payment service…"
            : null;

  const handleAddressSaved = async () => {
    const me = await reloadUser();
    const newest = [...(me?.addresses ?? [])].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))[0];
    if (newest) setSelectedAddress(newest.id);
    setAddingAddress(false);
  };

  const payNow = async () => {
    if (!addressId || blocker || placing) return;
    const summary: OrderSummary = { total, units: cart.count, address };

    pendingRef.current = {};
    setOrderError(null);
    setSlow(false);
    setPayment({ kind: "placing", summary });

    try {
      const order = await orderApi.create(user.id, {
        addressId,
        products: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
      if (pendingRef.current) pendingRef.current.orderId = order.orderId;
      // If the link already arrived over the socket, we're redirecting: leave that alone.
      setPayment((p) =>
        p.kind === "placing" ? { kind: "waiting", summary: p.summary, orderId: order.orderId, message: order.message } : p,
      );
      window.scrollTo({ top: 0 });
    } catch (err) {
      pendingRef.current = null;
      setPayment({ kind: "idle" });
      setOrderError(errorMessage(err, "Your order couldn't be placed. Try again."));
      // 402 = some products are no longer available: refresh stock so they're flagged.
      if (err instanceof ApiError && err.status === 402) stock.reload();
    }
  };

  return (
    <div className="ml-container ml-checkout">
      <h1>Checkout</h1>

      <div className="ml-checkout-grid">
        <div className="ml-checkout-main">
          {/* ---------- Address ---------- */}
          <section className="ml-panel" aria-labelledby="address-title">
            <div className="ml-panel-head">
              <h2 id="address-title">Delivery address</h2>
              {addresses.length > 0 && !addingAddress && (
                <button type="button" className="ml-link" onClick={() => setAddingAddress(true)}>
                  Add new address
                </button>
              )}
            </div>

            {addresses.length > 0 && (
              <fieldset className="ml-address-list">
                <legend className="ml-sr">Choose a delivery address</legend>
                {addresses.map((a) => {
                  const checked = a.id === addressId;
                  return (
                    <label key={a.id} className={`ml-address${checked ? " is-selected" : ""}`}>
                      <input type="radio" name="address" value={a.id} checked={checked} onChange={() => setSelectedAddress(a.id)} />
                      <Icon name="pin" size={18} />
                      <span className="ml-address-body">
                        <strong>{a.addressLine1}</strong>
                        {a.addressLine2 && <span>{a.addressLine2}</span>}
                        <span>{a.postalCode}</span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            )}

            {addresses.length === 0 && !addingAddress && (
              <div className="ml-panel-empty">
                <p>You don't have a saved address yet.</p>
                <button type="button" className="ml-btn ml-btn--ghost" onClick={() => setAddingAddress(true)}>
                  <Icon name="plus" size={16} /> Add address
                </button>
              </div>
            )}

            {addingAddress && (
              <AddressForm onSaved={handleAddressSaved} onCancel={() => setAddingAddress(false)} />
            )}
          </section>

          {/* ---------- Items ---------- */}
          <section className="ml-panel" aria-labelledby="items-title">
            <div className="ml-panel-head">
              <h2 id="items-title">
                Items <span className="ml-muted">({cart.count})</span>
              </h2>
            </div>
            <ul className="ml-lines">
              {cart.items.map((item) => {
                const isUnavailable = unavailable.has(item.productId);
                const each = unitPrice(item.price, item.discount);
                return (
                  <li key={item.productId} className={`ml-line${isUnavailable ? " is-unavailable" : ""}`}>
                    <ProductImage src={item.imageUrl} alt="" className="ml-line-img" />
                    <div className="ml-line-info">
                      <Link to={`/products/${item.productId}`} className="ml-line-name">
                        {item.productName}
                      </Link>
                      <span className="ml-muted ml-small">
                        {formatPrice(each)} each
                        {item.price > each && (
                          <>
                            {" "}
                            <s>{formatPrice(item.price)}</s>
                          </>
                        )}
                      </span>
                      {isUnavailable && <span className="ml-stock ml-stock--out">No longer available</span>}
                    </div>
                    <div className="ml-line-qty">
                      <QuantityStepper
                        value={item.quantity}
                        max={Math.max(item.stock, 1)}
                        label={`Quantity of ${item.productName}`}
                        onChange={(n) => cart.setQuantity(item.productId, n)}
                        disabled={isUnavailable || placing}
                      />
                      <button
                        type="button"
                        className="ml-link ml-link--muted"
                        onClick={() => cart.remove(item.productId)}
                        disabled={placing}
                      >
                        Remove
                      </button>
                    </div>
                    <span className="ml-line-total">{formatPrice(each * item.quantity)}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* ---------- Summary ---------- */}
        <aside className="ml-summary" aria-labelledby="summary-title">
          <h2 id="summary-title">Order summary</h2>
          <dl className="ml-summary-rows">
            <div>
              <dt>Items ({cart.count})</dt>
              <dd>{formatPrice(mrp)}</dd>
            </div>
            {savings > 0.004 && (
              <div className="ml-summary-save">
                <dt>Discount</dt>
                <dd>−{formatPrice(savings)}</dd>
              </div>
            )}
            <div className="ml-summary-total">
              <dt>Total</dt>
              <dd>{formatPrice(total)}</dd>
            </div>
          </dl>

          {address && (
            <p className="ml-summary-address">
              <Icon name="pin" size={16} />
              <span>Delivering to {formatAddress(address)}</span>
            </p>
          )}

          {orderError && (
            <div className="ml-alert ml-alert--error" role="alert">
              {orderError}
            </div>
          )}

          <button
            type="button"
            className="ml-btn ml-btn--primary ml-btn--block ml-btn--lg"
            onClick={() => void payNow()}
            disabled={placing || Boolean(blocker)}
            aria-describedby={blocker ? "pay-blocker" : undefined}
          >
            {payment.kind === "placing" ? "Placing order…" : "Pay now"}
          </button>
          {blocker && (
            <p id="pay-blocker" className="ml-muted ml-small ml-center">
              {blocker}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}