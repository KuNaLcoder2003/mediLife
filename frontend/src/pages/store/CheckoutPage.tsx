// import { useEffect, useRef, useState } from "react";
// import { Link } from "react-router-dom";
// import { useAuth } from "../../auth/auth-context";
// import { useCart } from "../../cart/cart-context";
// import AddressForm from "../../components/store/AddressForm";
// import FullPageLoader from "../../components/store/FullPageLoader";
// import Icon from "../../components/store/Icon";
// import ProductImage from "../../components/store/ProductImage";
// import QuantityStepper from "../../components/store/QuantityStepper";
// import { useQuery } from "../../hooks/useQuery";
// import { orderApi, productApi } from "../../lib/api";
// import { errorMessage, formatPrice, unitPrice } from "../../lib/format";
// import { ApiError } from "../../lib/http";
// import type { Address, Product } from "../../lib/types";
// import { useRealtime } from "../../lib/realtime-context";

// interface OrderSummary {
//   total: number;
//   units: number;
//   address: Address | undefined;
// }

// /**
//  * idle -> placing (POST /newOrder) -> waiting (for the WebSocket) -> redirecting (to the payment page)
//  * Anything that goes wrong lands back on idle with `orderError` set.
//  */
// type PaymentState =
//   | { kind: "idle" }
//   | { kind: "placing"; summary: OrderSummary }
//   | { kind: "waiting"; summary: OrderSummary; orderId?: string; message: string }
//   | { kind: "redirecting"; summary: OrderSummary; url: string };

// const SLOW_AFTER_MS = 30_000;

// /** Only follow links that are real web URLs (never javascript: etc.). */
// function safePaymentUrl(raw: string): string | null {
//   try {
//     const url = new URL(raw);
//     if (url.protocol === "https:") return url.toString();
//     if (url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) return url.toString();
//   } catch {
//     /* not a URL */
//   }
//   return null;
// }

// const formatAddress = (a: Address) => [a.addressLine1, a.addressLine2, a.postalCode].filter(Boolean).join(", ");

// export default function CheckoutPage() {
//   const { user, reloadUser } = useAuth();
//   const cart = useCart();
//   const realtime = useRealtime();

//   const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
//   const [addingAddress, setAddingAddress] = useState(false);
//   const [payment, setPayment] = useState<PaymentState>({ kind: "idle" });
//   const [orderError, setOrderError] = useState<string | null>(null);
//   const [slow, setSlow] = useState(false);
//   const placing = payment.kind !== "idle";

//   // Which order we're waiting on. Set synchronously in payNow so a WebSocket
//   // message that arrives before the HTTP response still gets matched.
//   const pendingRef = useRef<{ orderId?: string } | null>(null);

//   // Re-check price and stock for everything in the bag whenever its contents change.
//   const ids = cart.items
//     .map((i) => i.productId)
//     .sort()
//     .join(",");
//   const stock = useQuery(ids ? `stock:${ids}` : null, async () => {
//     const list = ids.split(",");
//     const results = await Promise.allSettled(list.map((id) => productApi.getById(id)));
//     const fresh: Product[] = [];
//     const unavailable: string[] = [];
//     results.forEach((r, i) => {
//       if (r.status === "fulfilled" && r.value) {
//         fresh.push(r.value);
//         if (r.value.quantity <= 0) unavailable.push(r.value.id);
//       } else {
//         unavailable.push(list[i] as string);
//       }
//     });
//     cart.sync(fresh);
//     return new Set(unavailable);
//   });

//   const { clear: clearCart } = cart;
//   const reloadStock = stock.reload;

//   // Payment link / inventory notifications for the order being placed.
//   useEffect(
//     () =>
//       realtime.subscribe((message) => {
//         const pending = pendingRef.current;
//         if (!pending) return;
//         if (message.type !== "PAYMENT_LINK_CREATED" && message.type !== "INVENTORY_UNAVAILABLE") return;
//         if (message.orderId && pending.orderId && message.orderId !== pending.orderId) return;

//         pendingRef.current = null;

//         if (message.type === "PAYMENT_LINK_CREATED") {
//           const url = safePaymentUrl(message.paymentUrl);
//           if (!url) {
//             setPayment({ kind: "idle" });
//             setOrderError("We received an invalid payment link. Please contact support before trying again.");
//             return;
//           }
//           clearCart();
//           setPayment((p) => (p.kind === "idle" ? p : { kind: "redirecting", summary: p.summary, url }));
//         } else {
//           setPayment({ kind: "idle" });
//           setOrderError(
//             message.message ??
//             "Some items went out of stock while we confirmed your order. Update your bag and try again.",
//           );
//           reloadStock();
//         }
//       }),
//     [realtime, clearCart, reloadStock],
//   );

//   // Send the user to the payment page as soon as the link is ready.
//   useEffect(() => {
//     if (payment.kind === "redirecting") window.location.assign(payment.url);
//   }, [payment]);

//   // Reassure the user if the payment link takes a while.
//   useEffect(() => {
//     if (payment.kind !== "waiting") return;
//     const id = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);
//     return () => window.clearTimeout(id);
//   }, [payment.kind]);

//   if (!user) return <FullPageLoader label="Loading your details…" />;

//   /* ---------- Waiting for / following the payment link ---------- */
//   if (payment.kind === "waiting" || payment.kind === "redirecting") {
//     const { summary } = payment;
//     const redirecting = payment.kind === "redirecting";
//     return (
//       <div className="ml-container ml-checkout">
//         <div className="ml-success" role="status" aria-live="polite">
//           {redirecting ? (
//             <span className="ml-success-icon">
//               <Icon name="check" size={28} />
//             </span>
//           ) : (
//             <span className="ml-spinner ml-spinner--lg" aria-hidden="true" />
//           )}
//           <h1>{redirecting ? "Taking you to payment" : "Preparing your payment"}</h1>
//           <p>
//             {redirecting
//               ? "Your payment page is opening."
//               : "Your order is confirmed. We're creating a secure payment link, which usually takes a few seconds."}
//           </p>
//           {slow && !redirecting && (
//             <p className="ml-notice">
//               This is taking longer than usual. Keep this page open and the payment page will open as soon as it's ready.
//             </p>
//           )}
//           <dl className="ml-success-facts">
//             <div>
//               <dt>Items</dt>
//               <dd>{summary.units}</dd>
//             </div>
//             <div>
//               <dt>Total</dt>
//               <dd>{formatPrice(summary.total)}</dd>
//             </div>
//             {summary.address && (
//               <div>
//                 <dt>Delivering to</dt>
//                 <dd>{formatAddress(summary.address)}</dd>
//               </div>
//             )}
//           </dl>
//           {redirecting && (
//             <a href={payment.url} className="ml-btn ml-btn--primary">
//               Continue to payment
//             </a>
//           )}
//         </div>
//       </div>
//     );
//   }

//   /* ---------- Empty bag ---------- */
//   if (cart.items.length === 0) {
//     return (
//       <div className="ml-container ml-checkout">
//         <div className="ml-empty">
//           <h1>Your bag is empty</h1>
//           <p>Add products to your bag, then come back here to check out.</p>
//           <Link to="/products" className="ml-btn ml-btn--primary">
//             Browse products
//           </Link>
//         </div>
//       </div>
//     );
//   }

//   const addresses = user.addresses;
//   const addressId =
//     selectedAddress && addresses.some((a) => a.id === selectedAddress) ? selectedAddress : (addresses[0]?.id ?? null);
//   const address = addresses.find((a) => a.id === addressId);

//   const unavailable = stock.data ?? new Set<string>();
//   const hasUnavailable = cart.items.some((i) => unavailable.has(i.productId));

//   const mrp = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
//   const total = cart.items.reduce((sum, i) => sum + unitPrice(i.price, i.discount) * i.quantity, 0);
//   const savings = mrp - total;

//   const blocker = !addressId
//     ? "Add a delivery address to continue."
//     : hasUnavailable
//       ? "Remove unavailable items to continue."
//       : stock.loading
//         ? "Checking stock…"
//         : realtime.status === "offline"
//           ? "Can't reach the payment service. Retrying…"
//           : realtime.status !== "ready"
//             ? "Connecting to the payment service…"
//             : null;

//   const handleAddressSaved = async () => {
//     const me = await reloadUser();
//     const newest = [...(me?.addresses ?? [])].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))[0];
//     if (newest) setSelectedAddress(newest.id);
//     setAddingAddress(false);
//   };

//   const payNow = async () => {
//     if (!addressId || blocker || placing) return;
//     const summary: OrderSummary = { total, units: cart.count, address };

//     pendingRef.current = {};
//     setOrderError(null);
//     setSlow(false);
//     setPayment({ kind: "placing", summary });

//     try {
//       const order = await orderApi.create(user.id, {
//         addressId,
//         products: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
//       });
//       if (pendingRef.current) pendingRef.current.orderId = order.orderId;
//       // If the link already arrived over the socket, we're redirecting: leave that alone.
//       setPayment((p) =>
//         p.kind === "placing" ? { kind: "waiting", summary: p.summary, orderId: order.orderId, message: order.message } : p,
//       );
//       window.scrollTo({ top: 0 });
//     } catch (err) {
//       pendingRef.current = null;
//       setPayment({ kind: "idle" });
//       setOrderError(errorMessage(err, "Your order couldn't be placed. Try again."));
//       // 402 = some products are no longer available: refresh stock so they're flagged.
//       if (err instanceof ApiError && err.status === 402) stock.reload();
//     }
//   };

//   return (
//     <div className="ml-container ml-checkout">
//       <h1>Checkout</h1>

//       <div className="ml-checkout-grid">
//         <div className="ml-checkout-main">
//           {/* ---------- Address ---------- */}
//           <section className="ml-panel" aria-labelledby="address-title">
//             <div className="ml-panel-head">
//               <h2 id="address-title">Delivery address</h2>
//               {addresses.length > 0 && !addingAddress && (
//                 <button type="button" className="ml-link" onClick={() => setAddingAddress(true)}>
//                   Add new address
//                 </button>
//               )}
//             </div>

//             {addresses.length > 0 && (
//               <fieldset className="ml-address-list">
//                 <legend className="ml-sr">Choose a delivery address</legend>
//                 {addresses.map((a) => {
//                   const checked = a.id === addressId;
//                   return (
//                     <label key={a.id} className={`ml-address${checked ? " is-selected" : ""}`}>
//                       <input type="radio" name="address" value={a.id} checked={checked} onChange={() => setSelectedAddress(a.id)} />
//                       <Icon name="pin" size={18} />
//                       <span className="ml-address-body">
//                         <strong>{a.addressLine1}</strong>
//                         {a.addressLine2 && <span>{a.addressLine2}</span>}
//                         <span>{a.postalCode}</span>
//                       </span>
//                     </label>
//                   );
//                 })}
//               </fieldset>
//             )}

//             {addresses.length === 0 && !addingAddress && (
//               <div className="ml-panel-empty">
//                 <p>You don't have a saved address yet.</p>
//                 <button type="button" className="ml-btn ml-btn--ghost" onClick={() => setAddingAddress(true)}>
//                   <Icon name="plus" size={16} /> Add address
//                 </button>
//               </div>
//             )}

//             {addingAddress && (
//               <AddressForm onSaved={handleAddressSaved} onCancel={() => setAddingAddress(false)} />
//             )}
//           </section>

//           {/* ---------- Items ---------- */}
//           <section className="ml-panel" aria-labelledby="items-title">
//             <div className="ml-panel-head">
//               <h2 id="items-title">
//                 Items <span className="ml-muted">({cart.count})</span>
//               </h2>
//             </div>
//             <ul className="ml-lines">
//               {cart.items.map((item) => {
//                 const isUnavailable = unavailable.has(item.productId);
//                 const each = unitPrice(item.price, item.discount);
//                 return (
//                   <li key={item.productId} className={`ml-line${isUnavailable ? " is-unavailable" : ""}`}>
//                     <ProductImage src={item.imageUrl} alt="" className="ml-line-img" />
//                     <div className="ml-line-info">
//                       <Link to={`/products/${item.productId}`} className="ml-line-name">
//                         {item.productName}
//                       </Link>
//                       <span className="ml-muted ml-small">
//                         {formatPrice(each)} each
//                         {item.price > each && (
//                           <>
//                             {" "}
//                             <s>{formatPrice(item.price)}</s>
//                           </>
//                         )}
//                       </span>
//                       {isUnavailable && <span className="ml-stock ml-stock--out">No longer available</span>}
//                     </div>
//                     <div className="ml-line-qty">
//                       <QuantityStepper
//                         value={item.quantity}
//                         max={Math.max(item.stock, 1)}
//                         label={`Quantity of ${item.productName}`}
//                         onChange={(n) => cart.setQuantity(item.productId, n)}
//                         disabled={isUnavailable || placing}
//                       />
//                       <button
//                         type="button"
//                         className="ml-link ml-link--muted"
//                         onClick={() => cart.remove(item.productId)}
//                         disabled={placing}
//                       >
//                         Remove
//                       </button>
//                     </div>
//                     <span className="ml-line-total">{formatPrice(each * item.quantity)}</span>
//                   </li>
//                 );
//               })}
//             </ul>
//           </section>
//         </div>

//         {/* ---------- Summary ---------- */}
//         <aside className="ml-summary" aria-labelledby="summary-title">
//           <h2 id="summary-title">Order summary</h2>
//           <dl className="ml-summary-rows">
//             <div>
//               <dt>Items ({cart.count})</dt>
//               <dd>{formatPrice(mrp)}</dd>
//             </div>
//             {savings > 0.004 && (
//               <div className="ml-summary-save">
//                 <dt>Discount</dt>
//                 <dd>−{formatPrice(savings)}</dd>
//               </div>
//             )}
//             <div className="ml-summary-total">
//               <dt>Total</dt>
//               <dd>{formatPrice(total)}</dd>
//             </div>
//           </dl>

//           {address && (
//             <p className="ml-summary-address">
//               <Icon name="pin" size={16} />
//               <span>Delivering to {formatAddress(address)}</span>
//             </p>
//           )}

//           {orderError && (
//             <div className="ml-alert ml-alert--error" role="alert">
//               {orderError}
//             </div>
//           )}

//           <button
//             type="button"
//             className="ml-btn ml-btn--primary ml-btn--block ml-btn--lg"
//             onClick={() => void payNow()}
//             disabled={placing || Boolean(blocker)}
//             aria-describedby={blocker ? "pay-blocker" : undefined}
//           >
//             {payment.kind === "placing" ? "Placing order…" : "Pay now"}
//           </button>
//           {blocker && (
//             <p id="pay-blocker" className="ml-muted ml-small ml-center">
//               {blocker}
//             </p>
//           )}
//         </aside>
//       </div>
//     </div>
//   );
// }

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/auth-context";
import { useCart, type CartItem } from "../../cart/cart-context";
import { AlertIcon, ArrowLeftIcon, ArrowRightIcon, CheckIcon, LockIcon, ShieldIcon, TruckIcon } from "../../components/store/auth/Icons";
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

// "Tomorrow"(there is no delivery API)same as the product page
const ARRIVES = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" }).format(
  new Date(Date.now() + 86_400_000),
);

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
  const [coupon, setCoupon] = useState("");
  const [couponMsg, setCouponMsg] = useState("");
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

  // Payment link / inventory notifications for the order being placed
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

  // Send the user to the payment page as soon as the link is ready
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

  /*Waiting for / following the payment link*/
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

  /*Empty cart  */
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

            {/* Items*/}
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
                        <button type="button" className="ct-remove" onClick={() => cart.remove(item.productId)} disabled={placing}>Remove</button>
                      </div>
                    </div>

                    {out ? (
                      <span />
                    ) : (
                      <div className="ct-stepper" role="group" aria-label={`Quantity of ${item.productName}`}>
                        <button type="button" onClick={() => cart.setQuantity(item.productId, item.quantity - 1)} disabled={placing || item.quantity <= 1} aria-label="Decrease quantity">−</button>
                        <output aria-live="polite">{item.quantity}</output>
                        <button type="button" onClick={() => cart.setQuantity(item.productId, item.quantity + 1)} disabled={placing || item.quantity >= Math.max(item.stock, 1)} aria-label="Increase quantity">+</button>
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

            {/*Address*/}
            <section className="ct-card ct-address" aria-labelledby="address-title">
              <div className="ct-address__head">
                <h2 id="address-title">Delivery address</h2>
                {addresses.length > 0 && !addingAddress && (
                  <button type="button" className="ct-link" onClick={() => setAddingAddress(true)}>Add new address</button>
                )}
              </div>

              {addresses.length > 0 && (
                <fieldset className="ct-address__list">
                  <legend className="hm-sr">Choose a delivery address</legend>
                  {addresses.map((a) => {
                    const checked = a.id === addressId;
                    return (
                      <label key={a.id} className={`ct-addr${checked ? " is-selected" : ""}`}>
                        <input type="radio" name="address" value={a.id} checked={checked} onChange={() => setSelectedAddress(a.id)} />
                        <span>
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
                <div className="ct-address__empty">
                  <p>You don't have a saved address yet.</p>
                  <button type="button" className="hm-btn hm-btn--outline" onClick={() => setAddingAddress(true)}>+ Add address</button>
                </div>
              )}

              {addingAddress && <AddressForm onSaved={handleAddressSaved} onCancel={() => setAddingAddress(false)} />}
            </section>

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
                      <button type="button" onClick={() => cart.add(v.raw, 1)} disabled={placing} aria-label={`Add ${v.name} to cart`}>+</button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* ---------- Summary ---------- */}
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

              {address && (
                <p className="ct-deliver-to">
                  <TruckIcon />
                  <span>Delivering to {formatAddress(address)}</span>
                </p>
              )}

              {orderError && <p className="ct-alert" role="alert"><AlertIcon />{orderError}</p>}

              <button
                type="button"
                className="hm-btn hm-btn--solid hm-btn--lg ct-checkout"
                onClick={() => void payNow()}
                disabled={placing || Boolean(blocker)}
                aria-describedby={blocker ? "pay-blocker" : undefined}
              >
                {payment.kind === "placing" ? "Placing order…" : <>Proceed to payment <ArrowRightIcon /></>}
              </button>
              {blocker && <p id="pay-blocker" className="ct-blocker">{blocker}</p>}
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