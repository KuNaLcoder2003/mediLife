import { Link } from "react-router-dom";
import { formatDate, formatPrice } from "../../lib/format";
import { ArrowRightIcon, DocIcon, HeadsetIcon, RefreshIcon, ShieldIcon, TruckIcon } from "./auth/Icons";
import { AddToCartButton, ProductCard, ProductCardSkeleton } from "./Productcard";
import { HOME_CONTENT } from "../../lib/homeContent";
import CategoryIcon from "./CategoryIcon";
import { toneOf, type CategoryStat, type ProductView } from "../../lib/Homedata";

type Add = (product: ProductView) => boolean;
const catLink = (name: string) => `/products?category=${encodeURIComponent(name)}`;

/* Hero  */
export function Hero({ stats, topDeal }: { stats: CategoryStat[]; topDeal?: ProductView }) {
  const tiles = [...stats].sort((a, b) => b.count - a.count).slice(0, 4);
  return (
    <section className="hm-wide hm-hero">
      <div className="hm-hero__main">
        <div className="hm-hero__copy">
          {topDeal && <span className="hm-chip">Offers live · up to {Math.round(topDeal.pct)}% off</span>}
          <h1>Everyday health supplies, delivered to your door.</h1>
          <p>Monitors, diabetes care, first aid and mobility aids from verified brands, checked by our pharmacists.</p>
          <div className="hm-hero__cta">
            <Link to="/products" className="hm-btn hm-btn--solid hm-btn--lg">Shop all products</Link>
            <Link to={HOME_CONTENT.prescriptionHref} className="hm-btn hm-btn--outline hm-btn--lg"><DocIcon />Upload prescription</Link>
          </div>
        </div>
        {tiles.length > 0 && (
          <ul className="hm-hero__tiles">
            {tiles.map((t) => (
              <li key={t.id}>
                <Link to={catLink(t.name)} className="hm-minitile">
                  <span className={`hm-minitile__icon hm-tone-${toneOf(t.name)}`}><CategoryIcon name={t.name} /></span>
                  <strong>{t.name}</strong>
                  <small>{t.count > 0 ? `from ${formatPrice(t.minPrice)}` : "No products yet"}</small>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
 
      <div className="hm-hero__side">
        <div className="hm-promo hm-promo--blue">
          <small>{topDeal?.category || "Browse the store"}</small>
          <h2>{topDeal ? `Up to ${Math.round(topDeal.pct)}% off on ${topDeal.category || "selected items"}` : "Everything you need, in one place"}</h2>
          <Link to={topDeal ? "/products?offer=1" : "/products"}>Shop now <ArrowRightIcon /></Link>
        </div>
        <div className="hm-promo hm-promo--amber">
          <small>For clinics &amp; pharmacies</small>
          <h2>Bulk pricing on orders above {formatPrice(HOME_CONTENT.bulkAbove)}</h2>
          <a href={HOME_CONTENT.bulkQuoteHref}>Get a quote <ArrowRightIcon /></a>
        </div>
      </div>
    </section>
  );
}
 
/*Trust strip  */
 
const TRUST = [
  { icon: <ShieldIcon />, title: "100% genuine", text: "From authorised distributors" },
  { icon: <HeadsetIcon />, title: "Pharmacist support", text: `Free advice, ${HOME_CONTENT.supportHours}` },
  { icon: <TruckIcon />, title: "Fast delivery", text: "Next day in 120+ cities" },
  { icon: <RefreshIcon />, title: "Easy returns", text: "7 days on unopened items" },
];
 
export function TrustStrip() {
  return (
    <ul className="hm-wide hm-trust">
      {TRUST.map(({ icon, title, text }) => (
        <li key={title}>
          <span className="hm-trust__icon">{icon}</span>
          <div><strong>{title}</strong><small>{text}</small></div>
        </li>
      ))}
    </ul>
  );
}
 
/*Shop by category */
 
export function CategoryGrid({ stats, loading }: { stats: CategoryStat[]; loading: boolean }) {
  if (!loading && stats.length === 0) return null;
  return (
    <section className="hm-wide hm-section">
      <div className="hm-section__head">
        <h2>Shop by category</h2>
        <Link to="/products" className="hm-see-all">All categories <ArrowRightIcon /></Link>
      </div>
      <ul className="hm-cats">
        {loading
          ? Array.from({ length: 6 }, (_, i) => <li key={i} className="hm-cat hm-skel" aria-hidden="true"><i /><i /></li>)
          : stats.slice(0, 6).map((s) => (
              <li key={s.id}>
                <Link to={catLink(s.name)} className="hm-cat">
                  <span className={`hm-cat__icon hm-tone-${toneOf(s.name)}`}><CategoryIcon name={s.name} /></span>
                  <strong>{s.name}</strong>
                  <small>{s.count} {s.count === 1 ? "product" : "products"}</small>
                </Link>
              </li>
            ))}
      </ul>
    </section>
  );
}
 
/*Buy again*/
 
export function BuyAgain({ items, onAdd }: { items: { product: ProductView; date: string }[]; onAdd: Add }) {
  if (items.length === 0) return null;
  return (
    <section className="hm-wide hm-section">
      <div className="hm-again">
        <div className="hm-section__head">
          <div>
            <h2 className="hm-h3">Buy again</h2>
            <p className="hm-sub">From your recent orders</p>
          </div>
          <Link to="/account" className="hm-see-all">View my orders <ArrowRightIcon /></Link>
        </div>
        <ul className="hm-again__list">
          {items.map(({ product, date }) => (
            <li key={product.id} className="hm-again__item">
              <span className={`hm-again__icon hm-tone-${toneOf(product.category)}`}>
                {product.image ? <img src={product.image} alt="" /> : <CategoryIcon name={product.category} />}
              </span>
              <div>
                <strong title={product.name}>{product.name}</strong>
                <small>{formatPrice(product.finalPrice)}{date ? ` · ordered ${formatDate(date)}` : ""}</small>
              </div>
              <AddToCartButton product={product} onAdd={onAdd} label="Reorder" variant="outline" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
 
/* Product row  */
 
interface RowProps {
  title: string;
  subtitle: string;
  to: string;
  products: ProductView[];
  loading?: boolean;
  onAdd: Add;
}
 
export function ProductRow({ title, subtitle, to, products, loading, onAdd }: RowProps) {
  if (!loading && products.length === 0) return null;
  return (
    <section className="hm-wide hm-section">
      <div className="hm-section__head">
        <div>
          <h2>{title}</h2>
          <p className="hm-sub">{subtitle}</p>
        </div>
        <Link to={to} className="hm-see-all">View all <ArrowRightIcon /></Link>
      </div>
      <div className="hm-grid">
        {loading
          ? Array.from({ length: 5 }, (_, i) => <ProductCardSkeleton key={i} />)
          : products.map((p) => <ProductCard key={p.id} product={p} onAdd={onAdd} />)}
      </div>
    </section>
  );
}
 
/* Prescription banner  */
 
export function PrescriptionBanner() {
  return (
    <section className="hm-wide hm-section">
      <div className="hm-rx">
        <div>
          <h2>Have a prescription? Upload it once, reorder anytime.</h2>
          <p>Our pharmacists check it within 2 hours and keep it on file for repeat orders.</p>
        </div>
        <Link to={HOME_CONTENT.prescriptionHref} className="hm-btn hm-btn--white hm-btn--lg">Upload prescription</Link>
      </div>
    </section>
  );
}