import { useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import HomeFooter from "../../components/store/HomeFooter";
import HomeHeader from "../../components/store/HomeHeader";
import { BuyAgain, CategoryGrid, Hero, PrescriptionBanner, ProductRow, TrustStrip } from "../../components/store/Homesections";
import { categoryStats, reorderCandidates, toView, type ProductView } from "../../lib/Homedata";
import { CartContext } from "../../cart/cart-context";
import { useQuery } from "../../hooks/useQuery";
import { orderApi, productApi, userApi } from "../../lib/api";
import { tokenStore } from "../../lib/http";
import "../../styles/home.css";

const ESSENTIALS = /home|first|wound|care|hygiene/i;
 
export default function HomePage() {
  const token = useSyncExternalStore(tokenStore.subscribe, tokenStore.get);
  const tokenKey = token ? token.slice(-10) : null;
 
  const products = useQuery("home:products", (signal) => productApi.list(undefined, signal));
  const categories = useQuery("home:categories", () => productApi.categories());
  const me = useQuery(tokenKey ? `home:me:${tokenKey}` : null, () => userApi.me());
  const orders = useQuery(tokenKey ? `home:orders:${tokenKey}` : null, () => orderApi.list());
  const cart = useContext(CartContext);
  if (!cart) throw new Error("HomePage must be rendered inside <CartProvider>");
 
  /** Adds one unit; false when the cart already holds all the stock. */
  const addToCart = useCallback(
    (v: ProductView) => {
      const inCart = cart.items.find((i) => i.productId === v.id)?.quantity ?? 0;
      if (inCart >= v.quantity) return false;
      cart.add(v.raw, 1);
      return true;
    },
    [cart],
  );
 
  const cats = categories.data;
  const views = useMemo(() => (products.data ?? []).map((p) => toView(p, cats ?? [])), [products.data, cats]);
  const stats = useMemo(() => categoryStats(views, cats ?? []), [views, cats]);
 
  const inStock = views.filter((v) => v.quantity > 0);
  const topDeal = [...inStock].filter((v) => v.pct > 0).sort((a, b) => b.pct - a.pct)[0];
 
  // "Top picks": in-stock products, biggest discounts first (there is no sales endpoint yet).
  const topPicks = [...inStock].sort((a, b) => b.pct - a.pct).slice(0, 5);
  const taken = new Set(topPicks.map((p) => p.id));
  const rest = views.filter((v) => !taken.has(v.id));
  const essentials = [...rest.filter((v) => ESSENTIALS.test(v.category)), ...rest.filter((v) => !ESSENTIALS.test(v.category))].slice(0, 5);
 
  const again = useMemo(() => {
    const byId = new Map(views.map((v) => [v.id, v]));
    return reorderCandidates(orders.data ?? [])
      .flatMap(({ id, date }) => {
        const product = byId.get(id);
        return product && product.quantity > 0 ? [{ product, date }] : [];
      })
      .slice(0, 3);
  }, [views, orders.data]);
 
  const loading = products.loading;
 
  return (
    <div className="hm">
      <HomeHeader
        categories={cats ?? []}
        cartCount={cart.count}
        signedIn={Boolean(token)}
        userName={me.data?.name}
      />
 
      <main>
        {products.error && (
          <div className="hm-wide">
            <div className="hm-alert" role="alert">
              <span>{products.error}</span>
              <button type="button" onClick={products.reload}>Try again</button>
            </div>
          </div>
        )}
 
        <Hero stats={stats} topDeal={topDeal} />
        <TrustStrip />
        <CategoryGrid stats={stats} loading={loading || categories.loading} />
        <BuyAgain items={again} onAdd={addToCart} />
 
        <ProductRow
          title="Best sellers"
          subtitle="What customers are ordering this week"
          to="/products"
          products={topPicks}
          loading={loading}
          onAdd={addToCart}
        />
        <PrescriptionBanner />
        <ProductRow
          title="Home & first-aid essentials"
          subtitle="Keep these stocked at home"
          to="/products"
          products={essentials}
          loading={loading}
          onAdd={addToCart}
        />
 
        {products.data && views.length === 0 && (
          <div className="hm-wide hm-empty">
            <h2>The shelves are empty right now</h2>
            <p>Products added from the admin panel will show up here.</p>
            <Link to="/admin/products/new" className="hm-btn hm-btn--solid">Add a product</Link>
          </div>
        )}
      </main>
 
      <HomeFooter />
    </div>
  );
}
 