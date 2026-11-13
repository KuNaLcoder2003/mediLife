import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/auth-context";
import { useCart, type CartItem } from "../../cart/cart-context";
import { AlertIcon, ArrowLeftIcon, ArrowRightIcon, BankIcon, CardIcon, CashIcon, CheckIcon, LockIcon, MobileIcon, PinIcon, ShieldIcon, TruckIcon } from "../../components/store/auth/Icons";
import AddressForm from "../../components/store/AddressForm";
import CategoryIcon from "../../components/store/CategoryIcon";
import FullPageLoader from "../../components/store/FullPageLoader";
import { useQuery } from "../../hooks/useQuery";
import { orderApi, productApi } from "../../lib/api";
import { errorMessage, formatPrice, unitPrice } from "../../lib/format";
import { HOME_CONTENT } from "../../lib/homeContent";
import { toneOf, toView } from "../../lib/Homedata";
import { ApiError } from "../../lib/http";
import type { Address, Product } from "../../lib/types";
import { useRealtime } from "../../lib/realtime-context";


const ARRIVES = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" }).format(
  new Date(Date.now() + 86_400_000),
);

interface OrderSummary {
  total: number;
  units: number;
  address: Address | undefined;
}

type PaymentState =
  | { kind: "idle" }
  | { kind: "placing"; summary: OrderSummary }
  | { kind: "waiting"; summary: OrderSummary; orderId?: string; message: string }
  | { kind: "redirecting"; summary: OrderSummary; url: string };

const SLOW_AFTER_MS = 30_000;

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


type PaymentMethod = "UPI" | "CARD" | "NETBANKING" | "COD";

const METHODS: { id: PaymentMethod; title: string; hint: string; icon: ReactNode }[] = [
  { id: "UPI", title: "UPI", hint: "Google Pay, PhonePe, Paytm or any UPI app", icon: <MobileIcon /> },
  { id: "CARD", title: "Credit or debit card", hint: "Visa, Mastercard, RuPay", icon: <CardIcon /> },
  { id: "NETBANKING", title: "Netbanking", hint: "All major Indian banks", icon: <BankIcon /> },
  { id: "COD", title: "Cash on delivery", hint: "Pay in cash or UPI when it arrives", icon: <CashIcon /> },
];
const UPI_PATTERN = /^[\w.-]{2,}@[A-Za-z]{2,}$/;

const formatAddress = (a: Address) => [a.addressLine1, a.addressLine2, a.postalCode].filter(Boolean).join(", ");

export default function CheckoutPage() {
  const { user, reloadUser } = useAuth();
  const cart = useCart();
  const realtime = useRealtime();
  const [params, setParams] = useSearchParams();

  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [payment, setPayment] = useState<PaymentState>({ kind: "idle" });
  const [orderError, setOrderError] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [couponMsg, setCouponMsg] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("UPI");
  const [upiId, setUpiId] = useState("");
  const [upiMsg, setUpiMsg] = useState("");
  const placing = payment.kind !== "idle";

  
  const pendingRef = useRef<{ orderId?: string } | null>(null);

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

  const products = useQuery("checkout:suggestions", (signal) => productApi.list(undefined, signal));

  const { clear: clearCart } = cart;
  const reloadStock = stock.reload;

  
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

  useEffect(() => {
    if (payment.kind === "redirecting") window.location.assign(payment.url);
  }, [payment]);

  useEffect(() => {
    if (payment.kind !== "waiting") return;
    const id = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => window.clearTimeout(id);
  }, [payment.kind]);

  if (!user) return <FullPageLoader label="Loading your details…" />;

  /*  Waiting for*/
  if (payment.kind === "waiting" || payment.kind === "redirecting") {
    const { summary } = payment;
    const redirecting = payment.kind === "redirecting";
    return (
      <div className="ct-page">
        <div className="hm-wide">
          <div className="ct-card ct-status" role="status" aria-live="polite">
            {redirecting ? <span className="ct-status__icon"><CheckIcon /></span> : <span className="ct-spinner" aria-hidden="true" />}
            <h1>{redirecting ? "Taking you to payment" : "Preparing your payment"}</h1>
            <p>
              {redirecting
                ? "Your payment page is opening."
                : "Your order is confirmed. We're creating a secure payment link, which usually takes a few seconds."}
            </p>
            {slow && !redirecting && (
              <p className="ct-status__slow">This is taking longer than usual. Keep this page open and the payment page will open as soon as it's ready.</p>
            )}
            <dl className="ct-facts">
              <div><dt>Items</dt><dd>{summary.units}</dd></div>
              <div><dt>Total</dt><dd>{formatPrice(summary.total)}</dd></div>
              {summary.address && <div><dt>Delivering to</dt><dd>{formatAddress(summary.address)}</dd></div>}
            </dl>
            {redirecting && <a href={payment.url} className="hm-btn hm-btn--solid hm-btn--lg">Continue to payment</a>}
          </div>
        </div>
      </div>
    );
  }

  /* Empty cart*/
  if (cart.items.length === 0) {
    return (
      <div className="ct-page">
        <div className="hm-wide hm-empty">
          <h1>Your cart is empty</h1>
          <p>Add medicines and health essentials, then come back here to check out.</p>
          <Link to="/products" className="hm-btn hm-btn--solid">Browse products</Link>
        </div>
      </div>
    );
  }

  const addresses = user.addresses;
  const addressId =
    selectedAddress && addresses.some((a) => a.id === selectedAddress) ? selectedAddress : (addresses[0]?.id ?? null);
  const address = addresses.find((a) => a.id === addressId);

  const unavailable = stock.data ?? new Set<string>();
  const isOut = (i: CartItem) => unavailable.has(i.productId) || i.stock <= 0;
  const hasUnavailable = cart.items.some(isOut);
  const payable = cart.items.filter((i) => !isOut(i));
  const outCount = cart.items.length - payable.length;

  const mrp = payable.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const total = payable.reduce((sum, i) => sum + unitPrice(i.price, i.discount) * i.quantity, 0);
  const savings = mrp - total;
  const threshold = HOME_CONTENT.freeDeliveryAbove;
  const freeDelivery = total >= threshold;

  
  const inCart = new Set(cart.items.map((i) => i.productId));
  const cartCategories = new Set(cart.items.map((i) => i.category));
  const candidates = (products.data ?? []).map((p) => toView(p, [])).filter((v) => v.quantity > 0 && !inCart.has(v.id));
  const suggestions = [
    ...candidates.filter((v) => cartCategories.has(v.category)),
    ...candidates.filter((v) => !cartCategories.has(v.category)),
  ].slice(0, 3);

  const applyCoupon = (e: FormEvent) => {
    e.preventDefault();
    setCouponMsg(coupon.trim() ? "Coupons aren’t available yet." : "Enter a coupon code.");
  };

  const upiValid = UPI_PATTERN.test(upiId.trim());

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

  const verifyUpi = () => setUpiMsg(upiValid ? "UPI ID looks valid." : "Enter a UPI ID like name@bank.");

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
     
      setPayment((p) =>
        p.kind === "placing" ? { kind: "waiting", summary: p.summary, orderId: order.orderId, message: order.message } : p,
      );
      window.scrollTo({ top: 0 });
    } catch (err) {
      pendingRef.current = null;
      setPayment({ kind: "idle" });
      setOrderError(errorMessage(err, "Your order couldn't be placed. Try again."));

      if (err instanceof ApiError && err.status === 402) stock.reload();
    }
  };


  const step = params.get("step") === "checkout" && payable.length > 0 ? "checkout" : "cart";
  const goTo = (next: "cart" | "checkout") => {
    setParams(next === "cart" ? {} : { step: next });
    window.scrollTo({ top: 0 });
  };
  const addressNumber = addresses.findIndex((a) => a.id === addressId) + 1;

  /*address + payment*/
  if (step === "checkout") {
    return (
      <div className="ct-page">
        <div className="hm-wide">
          <ol className="ct-steps" aria-label="Checkout progress">
            <li className="is-done">
              <button type="button" onClick={() => goTo("cart")} disabled={placing}>
                <span><CheckIcon /></span> Cart
              </button>
            </li>
            <li className="ct-steps__line is-on" aria-hidden="true" />
            <li className="is-current" aria-current="step"><span>2</span> Address &amp; payment</li>
            <li className="ct-steps__line" aria-hidden="true" />
            <li><span>3</span> Confirmation</li>
          </ol>

          <div className="ct-layout">
            <div className="ct-stack">
              {/* Address*/}
              <section className="ct-card ct-panel" aria-labelledby="address-title">
                <header className="ct-panel__head">
                  <span className="ct-num">1</span>
                  <h2 id="address-title">Delivery address</h2>
                  <p>Choose where to deliver this order</p>
                </header>

                <fieldset className="ct-addrgrid">
                  <legend className="hm-sr">Choose a delivery address</legend>
                  {addresses.map((a, n) => {
                    const checked = a.id === addressId;
                    return (
                      <label key={a.id} className={`ct-addrcard${checked ? " is-selected" : ""}`}>
                        <span className="ct-addrcard__top">
                          <input type="radio" name="address" value={a.id} checked={checked} onChange={() => setSelectedAddress(a.id)} disabled={placing} />
                          <strong>Address {n + 1}</strong>
                          {n === 0 && <em>Default</em>}
                        </span>
                        <span className="ct-addrcard__body">
                          <strong>{user.name}</strong>
                          <span>{a.addressLine1}</span>
                          {a.addressLine2 && <span>{a.addressLine2}</span>}
                          <span>{a.postalCode}</span>
                          {user.mobile && <span>{user.mobile}</span>}
                        </span>
                        <span className="ct-addrcard__foot">Delivery by {ARRIVES}</span>
                      </label>
                    );
                  })}
                  <button type="button" className="ct-addnew" onClick={() => setAddingAddress(true)} disabled={addingAddress || placing}>
                    <span aria-hidden="true">+</span>
                    Add a new address
                  </button>
                </fieldset>

                {addingAddress && (
                  <div className="ct-newaddr">
                    <AddressForm onSaved={handleAddressSaved} onCancel={() => setAddingAddress(false)} />
                  </div>
                )}
              </section>

              {/* Delivery speed*/}
              <section className="ct-card ct-panel" aria-labelledby="speed-title">
                <header className="ct-panel__head">
                  <span className="ct-num">2</span>
                  <h2 id="speed-title">Delivery speed</h2>
                </header>
                <div className="ct-opts">
                  <label className="ct-opt is-selected">
                    <input type="radio" name="speed" checked onChange={() => undefined} />
                    <span><strong>Standard delivery</strong><small>Arrives {ARRIVES}</small></span>
                    <b>Free</b>
                  </label>
                  <label className="ct-opt is-disabled">
                    <input type="radio" name="speed" disabled />
                    <span><strong>Express delivery</strong><small>Coming soon</small></span>
                  </label>
                </div>
              </section>

              {/*Payment */}
              <section className="ct-card ct-panel" aria-labelledby="pay-title">
                <header className="ct-panel__head">
                  <span className="ct-num">3</span>
                  <h2 id="pay-title">Payment method</h2>
                </header>
                <div className="ct-paylist" role="radiogroup" aria-labelledby="pay-title">
                  {METHODS.map((m) => {
                    const selected = method === m.id;
                    return (
                      <div key={m.id} className={`ct-opt ct-opt--pay${selected ? " is-selected" : ""}`}>
                        <label className="ct-opt__main">
                          <input type="radio" name="payment" value={m.id} checked={selected} onChange={() => setMethod(m.id)} disabled={placing} />
                          <span className="ct-opt__icon">{m.icon}</span>
                          <span><strong>{m.title}</strong><small>{m.hint}</small></span>
                        </label>
                        {selected && m.id === "UPI" && (
                          <div className="ct-upi">
                            <input
                              className="pp-input"
                              value={upiId}
                              onChange={(e) => { setUpiId(e.target.value); setUpiMsg(""); }}
                              placeholder="yourname@bank"
                              autoComplete="off"
                              aria-label="UPI ID"
                              aria-invalid={upiMsg && !upiValid ? true : undefined}
                              disabled={placing}
                            />
                            <button type="button" className="hm-btn hm-btn--outline" onClick={verifyUpi} disabled={placing}>Verify</button>
                            {upiMsg && <p className={`ct-upi__msg${upiValid ? " is-ok" : ""}`} role="status">{upiMsg}</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="ct-paynote">You’ll complete the payment on our secure payment page.</p>
              </section>
            </div>

            {/* Summary*/}
            <aside aria-label="Order summary">
              <div className="ct-card ct-summary">
                <h2>Order summary</h2>

                {address && (
                  <p className="ct-deliver-to ct-deliver-to--box">
                    <PinIcon />
                    <span>
                      <strong>Delivering to Address {addressNumber}</strong>
                      <br />
                      {address.postalCode} · Delivery by {ARRIVES}
                    </span>
                  </p>
                )}

                <ul className="ct-lines">
                  {payable.map((item) => (
                    <li key={item.productId}>
                      <span className={`ct-lines__thumb hm-tone-${toneOf(item.category ?? "")}`}>
                        {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <CategoryIcon name={item.category ?? ""} />}
                        <b aria-label={`Quantity ${item.quantity}`}>{item.quantity}</b>
                      </span>
                      <span>{item.productName}</span>
                      <strong>{formatPrice(unitPrice(item.price, item.discount) * item.quantity)}</strong>
                    </li>
                  ))}
                </ul>

                <dl>
                  <div><dt>Items total (MRP)</dt><dd>{formatPrice(mrp)}</dd></div>
                  <div><dt>Discount</dt><dd className="ct-green">{savings > 0.004 ? `− ${formatPrice(savings)}` : formatPrice(0)}</dd></div>
                  <div><dt>Delivery</dt><dd className={freeDelivery ? "ct-green" : undefined}>{freeDelivery ? "Free" : "Added at checkout"}</dd></div>
                </dl>
                <div className="ct-total">
                  <strong>To pay</strong>
                  <strong>{formatPrice(total)}</strong>
                </div>

                {orderError && <p className="ct-alert" role="alert"><AlertIcon />{orderError}</p>}

                <button
                  type="button"
                  className="hm-btn hm-btn--solid hm-btn--lg ct-checkout"
                  onClick={() => void payNow()}
                  disabled={placing || Boolean(blocker)}
                  aria-describedby={blocker ? "pay-blocker" : undefined}
                >
                  {payment.kind === "placing" ? "Placing order…" : `Pay ${formatPrice(total)} & place order`}
                </button>
                {blocker && <p id="pay-blocker" className="ct-blocker">{blocker}</p>}
                <p className="ct-terms">
                  By placing this order you agree to our <a href="#">Terms</a> and <a href="#">Return policy</a>.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  /*cart*/
  return (
    <div className="ct-page">
      <div className="hm-wide">
        <header className="ct-head">
          <h1>Your cart <span>({cart.items.length} {cart.items.length === 1 ? "item" : "items"})</span></h1>
          <Link to="/products" className="ct-back"><ArrowLeftIcon /> Continue shopping</Link>
        </header>

        <div className="ct-layout">
          <div>
            {payable.length > 0 && (
              <div className="ct-card ct-ship">
                <p>
                  <TruckIcon />
                  {freeDelivery
                    ? `You’ve unlocked free delivery. Arrives by ${ARRIVES}.`
                    : `Add ${formatPrice(threshold - total)} more for free delivery.`}
                </p>
                <div className="ct-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round((total / threshold) * 100))} aria-label="Progress to free delivery">
                  <i style={{ width: `${Math.min(100, (total / threshold) * 100)}%` }} />
                </div>
              </div>
            )}

            <ul className="ct-card ct-list" aria-label="Items in your cart">
              {cart.items.map((item) => {
                const out = isOut(item);
                const low = !out && item.stock <= HOME_CONTENT.lowStockAt;
                const each = unitPrice(item.price, item.discount);
                const to = `/products/${encodeURIComponent(item.productId)}`;
                return (
                  <li key={item.productId} className={`ct-row${out ? " is-out" : ""}`}>
                    <Link to={to} className={`ct-thumb hm-tone-${toneOf(item.category ?? "")}`} aria-label={item.productName}>
                      {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <CategoryIcon name={item.category ?? ""} />}
                    </Link>

                    <div className="ct-info">
                      {item.category && <span className="ct-cat">{item.category}</span>}
                      <h3 className="ct-name"><Link to={to}>{item.productName}</Link></h3>
                      <p className={`ct-stock${out ? " is-out" : low ? " is-low" : ""}`}>
                        {out ? "Out of stock" : low ? `Only ${item.stock} left` : "In stock"}
                      </p>
                      <div className="ct-actions">
                        <button type="button" className="ct-remove" onClick={() => cart.remove(item.productId)}>Remove</button>
                      </div>
                    </div>

                    {out ? (
                      <span />
                    ) : (
                      <div className="ct-stepper" role="group" aria-label={`Quantity of ${item.productName}`}>
                        <button type="button" onClick={() => cart.setQuantity(item.productId, item.quantity - 1)} disabled={item.quantity <= 1} aria-label="Decrease quantity">−</button>
                        <output aria-live="polite">{item.quantity}</output>
                        <button type="button" onClick={() => cart.setQuantity(item.productId, item.quantity + 1)} disabled={item.quantity >= Math.max(item.stock, 1)} aria-label="Increase quantity">+</button>
                      </div>
                    )}

                    <div className="ct-price">
                      {out ? (
                        <>
                          <strong>—</strong>
                          <small>Unavailable</small>
                        </>
                      ) : (
                        <>
                          <strong>{formatPrice(each * item.quantity)}</strong>
                          {item.price > each && <s>{formatPrice(item.price * item.quantity)}</s>}
                          <small>{formatPrice(each)} each</small>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {outCount > 0 && (
              <p className="ct-alert" role="alert">
                <AlertIcon />
                {outCount === 1 ? "One item is" : `${outCount} items are`} out of stock and not included in your total. Remove {outCount === 1 ? "it" : "them"} to continue.
              </p>
            )}

            {suggestions.length > 0 && (
              <section className="ct-also" aria-labelledby="also-title">
                <h2 id="also-title">You might also need</h2>
                <ul className="ct-also__grid">
                  {suggestions.map((v) => (
                    <li key={v.id} className="ct-card ct-mini">
                      <Link to={`/products/${encodeURIComponent(v.id)}`} className={`ct-mini__thumb hm-tone-${toneOf(v.category)}`} aria-label={v.name}>
                        {v.image ? <img src={v.image} alt="" loading="lazy" /> : <CategoryIcon name={v.category} />}
                      </Link>
                      <div>
                        <strong>{v.name}</strong>
                        <small>{formatPrice(v.finalPrice)}</small>
                      </div>
                      <button type="button" onClick={() => cart.add(v.raw, 1)} aria-label={`Add ${v.name} to cart`}>+</button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside aria-label="Order summary">
            <div className="ct-card ct-summary">
              <h2>Order summary</h2>
              <dl>
                <div><dt>Items total (MRP)</dt><dd>{formatPrice(mrp)}</dd></div>
                <div><dt>Discount</dt><dd className="ct-green">{savings > 0.004 ? `− ${formatPrice(savings)}` : formatPrice(0)}</dd></div>
                <div><dt>Delivery</dt><dd className={freeDelivery ? "ct-green" : undefined}>{freeDelivery ? "Free" : "Added at checkout"}</dd></div>
              </dl>
              <div className="ct-total">
                <strong>To pay</strong>
                <strong>{formatPrice(total)}</strong>
              </div>
              <p className="ct-tax">Inclusive of all taxes</p>

              <form className="ct-coupon" onSubmit={applyCoupon}>
                <label htmlFor="coupon">Coupon code</label>
                <div>
                  <input id="coupon" className="pp-input" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="E.G. HEALTH10" />
                  <button type="submit" className="hm-btn hm-btn--outline">Apply</button>
                </div>
                {couponMsg && <p className="ct-coupon__msg" role="status">{couponMsg}</p>}
              </form>

              <button type="button" className="hm-btn hm-btn--solid hm-btn--lg ct-checkout" onClick={() => goTo("checkout")} disabled={hasUnavailable || payable.length === 0}>
                Proceed to checkout <ArrowRightIcon />
              </button>
              {hasUnavailable && <p className="ct-blocker">Remove unavailable items to continue.</p>}
              <p className="ct-secure"><LockIcon /> Secure checkout</p>
            </div>

            <p className="ct-trust">
              <ShieldIcon />
              All items are sourced from authorised distributors and checked before dispatch.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}