import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCart } from "../../cart/cart-context";
import { ArrowRightIcon, CheckIcon, HeadsetIcon, LockIcon, RefreshIcon, ShieldIcon, TruckIcon } from "../../components/store/auth/Icons";
import CategoryIcon from "../../components/store/CategoryIcon";
import { useQuery } from "../../hooks/useQuery";
import { productApi, userApi } from "../../lib/api";
import { formatPrice, shortId } from "../../lib/format";
import { freeDeliveryText, HOME_CONTENT } from "../../lib/homeContent";
import { ApiError, tokenStore } from "../../lib/http";
import { toneOf, toView, type ProductView } from "../../lib/Homedata";
import type { Product, ProductImage } from "../../lib/types";
import "../../styles/product.css";

const MAX_PER_ORDER = 20;


function Gallery({ images, name, category, pct }: { images: ProductImage[]; name: string; category: string; pct: number }) {
  const [active, setActive] = useState(0);
  const current = images[active]?.imageUrl;
  return (
    <div className={`pp-gallery${images.length > 1 ? "" : " pp-gallery--solo"}`}>
      {images.length > 1 && (
        <ul className="pp-thumbs" aria-label="Product images">
          {images.map((img, i) => (
            <li key={img.id}>
              <button type="button" className={i === active ? "is-active" : undefined} onClick={() => setActive(i)} aria-label={`Show image ${i + 1} of ${images.length}`} aria-pressed={i === active}>
                <img src={img.imageUrl} alt="" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={`pp-stage hm-tone-${toneOf(category)}`}>
        {pct > 0 && <span className="hm-badge">{Math.round(pct)}% off</span>}
        {current ? <img src={current} alt={name} /> : <span className="pp-stage__icon"><CategoryIcon name={category} /></span>}
      </div>
    </div>
  );
}

function QtyStepper({ value, max, onChange }: { value: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="pp-stepper" role="group" aria-label="Quantity">
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Decrease quantity">−</button>
      <output aria-live="polite">{value}</output>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity">+</button>
    </div>
  );
}

const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" });

/** Estimate only: there is no PIN-code API, so the date is always "tomorrow". */
function DeliveryCheck({ initial }: { initial: string }) {
  const [pin, setPin] = useState(initial);
  const [day, setDay] = useState("");
  const [error, setError] = useState("");

  const check = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pin)) {
      setDay("");
      setError("Enter a valid 6-digit PIN code.");
      return;
    }
    setError("");
    setDay(dayFormat.format(new Date(Date.now() + 86_400_000)));
  };

  return (
    <section className="pp-delivery" aria-labelledby="delivery-title">
      <h3 id="delivery-title">Check delivery</h3>
      <form onSubmit={check}>
        <input className="pp-input" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder="Enter PIN code" aria-label="PIN code" />
        <button type="submit" className="hm-btn hm-btn--outline">Check</button>
      </form>
      {day && (
        <p className="pp-delivery__res">
          <TruckIcon />
          <span><strong>Delivery by {day}</strong> to {pin} · {freeDeliveryText()}</span>
        </p>
      )}
      {error && <p className="pp-delivery__err" role="alert">{error}</p>}
    </section>
  );
}


function Description({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = (key: string) => {
    if (list.length) blocks.push(<ul key={key}>{list.map((li, i) => <li key={i}>{li}</li>)}</ul>);
    list = [];
  };
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    const bullet = /^[-•*]\s+(.*)$/.exec(line);
    if (bullet) list.push(bullet[1]);
    else {
      flush(`ul-${i}`);
      if (line) blocks.push(<p key={`p-${i}`}>{line}</p>);
    }
  });
  flush("ul-end");
  return <>{blocks.length ? blocks : <p>No description available for this product yet.</p>}</>;
}

function SimilarCard({ p }: { p: ProductView }) {
  return (
    <Link to={`/products/${encodeURIComponent(p.id)}`} className="pp-mini">
      <span className={`pp-mini__media hm-tone-${toneOf(p.category)}`}>
        {p.pct > 0 && <span className="hm-badge">{Math.round(p.pct)}% off</span>}
        {p.image ? <img src={p.image} alt="" loading="lazy" /> : <span className="pp-mini__icon"><CategoryIcon name={p.category} /></span>}
      </span>
      <span className="pp-mini__body">
        <strong>{p.name}</strong>
        <span className="hm-price">
          <strong>{formatPrice(p.finalPrice)}</strong>
          {p.pct > 0 && <s>{formatPrice(p.price)}</s>}
        </span>
      </span>
    </Link>
  );
}

/*Page */

export default function ProductPage() {
  const { productId = "" } = useParams();
  const product = useQuery(`product:${productId}`, async () => {
    try {
      return await productApi.getById(productId);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 400)) return null;
      throw err;
    }
  });

  let body: ReactNode;
  if (product.loading) {
    body = (
      <div className="pp-pdp" aria-busy="true" aria-label="Loading product">
        <span className="pp-skel pp-skel--stage" />
        <div className="pp-skel-stack">
          <span className="pp-skel pp-skel--line" />
          <span className="pp-skel pp-skel--title" />
          <span className="pp-skel pp-skel--box" />
        </div>
      </div>
    );
  } else if (product.error) {
    body = (
      <div className="hm-empty">
        <h1>This product couldn’t be loaded</h1>
        <p>{product.error}</p>
        <button type="button" className="hm-btn hm-btn--solid" onClick={product.reload}>Try again</button>
      </div>
    );
  } else if (!product.data) {
    body = (
      <div className="hm-empty">
        <h1>We couldn’t find this product</h1>
        <p>It may have been removed. Browse other products instead.</p>
        <Link to="/products" className="hm-btn hm-btn--solid">Browse products</Link>
      </div>
    );
  } else {
    body = <ProductDetails key={product.data.id} product={product.data} />;
  }

  return <div className="hm-wide pp-page">{body}</div>;
}

function ProductDetails({ product }: { product: Product }) {
  const navigate = useNavigate();
  const { items, add } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [tab, setTab] = useState<"desc" | "delivery">("desc");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const me = useQuery(tokenStore.get() ? "pdp:me" : null, () => userApi.me());
  const postal = me.data?.addresses?.[0]?.postalCode ?? "";

  const view = toView(product, []);
  const categoryName = view.category;
  const out = product.quantity <= 0;
  const low = !out && product.quantity <= HOME_CONTENT.lowStockAt;
  const cap = Math.max(1, Math.min(MAX_PER_ORDER, product.quantity));
  const inBag = items.find((i) => i.productId === product.id)?.quantity ?? 0;

  const related = useQuery(categoryName ? `related:${product.id}` : null, (signal) => productApi.list(undefined, signal));
  const similar = (related.data ?? [])
    .map((p) => toView(p, []))
    .filter((v) => v.id !== product.id && v.category === categoryName && v.quantity > 0)
    .slice(0, 4);

  const addToCart = () => {
    add(product, qty);
    setAdded(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAdded(false), 1800);
  };
  const buyNow = () => {
    add(product, qty);
    navigate("/checkout");
  };

  return (
    <>
      <nav aria-label="Breadcrumb">
        <ol className="pp-crumbs">
          <li><Link to="/">Home</Link></li>
          {categoryName && <li><Link to={`/products?category=${encodeURIComponent(categoryName)}`}>{categoryName}</Link></li>}
          <li aria-current="page">{product.productName}</li>
        </ol>
      </nav>

      <div className="pp-pdp">
        <Gallery images={product.images ?? []} name={product.productName} category={categoryName} pct={view.pct} />

        <div className="pp-info">
          {categoryName && <Link to={`/products?category=${encodeURIComponent(categoryName)}`} className="pp-cat">{categoryName}</Link>}
          <h1>{product.productName}</h1>
          <p className="pp-sku">Product ID {shortId(product.id)}</p>

          <div className="pp-pricebox">
            <div className="pp-pricebox__row">
              <strong>{formatPrice(view.finalPrice)}</strong>
              {view.pct > 0 && (
                <>
                  <span className="pp-mrp">MRP <s>{formatPrice(product.price)}</s></span>
                  <span className="pp-save">You save {formatPrice(product.price - view.finalPrice)} ({Math.round(view.pct)}%)</span>
                </>
              )}
            </div>
            <p className="pp-tax">Inclusive of all taxes</p>
          </div>

          <p className="pp-avail">
            <span className={`pp-dot${out ? " is-out" : low ? " is-low" : ""}`} />
            <strong>{out ? "Out of stock" : low ? `Only ${product.quantity} left` : "In stock"}</strong>
            {!out && !low && <span className="pp-muted">· {product.quantity} available</span>}
          </p>

          {!out && (
            <>
              <p className="pp-qty-label">Quantity</p>
              <div className="pp-buy">
                <QtyStepper value={qty} max={cap} onChange={setQty} />
                <button type="button" className="hm-btn hm-btn--solid" onClick={addToCart}>
                  {added ? <><CheckIcon /> Added to cart</> : "Add to cart"}
                </button>
                <button type="button" className="hm-btn pp-btn--dark" onClick={buyNow}>Buy now</button>
              </div>
              <p className="pp-note">
                Max {cap} per order
                {inBag > 0 && <> · {inBag} already in your cart. <Link to="/checkout">Go to checkout</Link></>}
              </p>
            </>
          )}

          <DeliveryCheck key={postal || "none"} initial={postal} />

          <ul className="pp-trust3">
            <li><ShieldIcon /> 100% genuine</li>
            <li><RefreshIcon /> 7-day returns</li>
            <li><LockIcon /> Secure payment</li>
          </ul>
        </div>
      </div>

      <div className="pp-lower">
        <div>
          <div className="pp-tabs" role="tablist" aria-label="Product information">
            <button type="button" role="tab" aria-selected={tab === "desc"} onClick={() => setTab("desc")}>Description</button>
            <button type="button" role="tab" aria-selected={tab === "delivery"} onClick={() => setTab("delivery")}>Delivery &amp; returns</button>
          </div>
          <div className="pp-desc" role="tabpanel">
            {tab === "desc" ? (
              <Description text={product.productDescription ?? ""} />
            ) : (
              <>
                <p>Orders are packed by our pharmacists and dispatched the same day. Delivery is usually next day in supported cities.</p>
                <p>Unopened items can be returned within 7 days of delivery for a refund. {freeDeliveryText()}.</p>
              </>
            )}
          </div>
        </div>

        <aside className="pp-help">
          <h2>Not sure this is right for you?</h2>
          <p>Our pharmacists can help you choose the right product. Free, {HOME_CONTENT.supportHours}.</p>
          <a href={`tel:${HOME_CONTENT.supportPhone.replace(/[^\d+]/g, "")}`}><HeadsetIcon /> Call a pharmacist</a>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="pp-similar" aria-labelledby="similar-title">
          <div className="pp-similar__head">
            <h2 id="similar-title">Similar products</h2>
            <Link to={`/products?category=${encodeURIComponent(categoryName)}`} className="hm-see-all">See all in {categoryName} <ArrowRightIcon /></Link>
          </div>
          <ul className="pp-similar__grid">
            {similar.map((p) => <li key={p.id}><SimilarCard p={p} /></li>)}
          </ul>
        </section>
      )}
    </>
  );
}