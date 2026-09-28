import { Link, NavLink, Outlet, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/auth-context";
import { useCart } from "../../cart/cart-context";
import { STORE_NAME } from "../../lib/config";
import { firstName } from "../../lib/format";
import Icon from "./Icon";
import Logo from "./Logo";
import SearchBar from "./SearchBar";

export default function StoreLayout() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const { status, user, signOut } = useAuth();
  const { count } = useCart();

  const onHome = pathname === "/";
  const q = pathname.startsWith("/products") ? (params.get("q") ?? "") : "";

  return (
    <div className="ml-app">
      <a href="#main" className="ml-skip">
        Skip to content
      </a>
      <header className="ml-header">
        <div className="ml-container ml-header-inner">
          <Logo />
          {!onHome && (
            <div className="ml-header-search">
              <SearchBar key={q} initialQuery={q} />
            </div>
          )}
          <nav className="ml-header-nav" aria-label="Main">
            <NavLink to="/products" className="ml-nav-link">
              Shop
            </NavLink>
            <Link to="/checkout" className="ml-bag-link" aria-label={`Bag, ${count} ${count === 1 ? "item" : "items"}`}>
              <Icon name="bag" size={20} />
              {count > 0 && <span className="ml-bag-count">{count > 99 ? "99+" : count}</span>}
            </Link>
            {status === "authenticated" ? (
              <div className="ml-account">
                <span className="ml-account-name">
                  <Icon name="user" size={18} />
                  {firstName(user?.name) || "Account"}
                </span>
                <button type="button" className="ml-btn ml-btn--ghost ml-btn--sm" onClick={() => void signOut()}>
                  Sign out
                </button>
              </div>
            ) : (
              status === "anonymous" && (
                <Link to="/login" state={{ from: pathname }} className="ml-btn ml-btn--ghost ml-btn--sm">
                  Sign in
                </Link>
              )
            )}
          </nav>
        </div>
      </header>

      <main id="main" className="ml-main">
        <Outlet />
      </main>

      <footer className="ml-footer">
        <div className="ml-container ml-footer-inner">
          <span>
            © {new Date().getFullYear()} {STORE_NAME}
          </span>
          <nav aria-label="Footer">
            <Link to="/products">All products</Link>
            <Link to="/checkout">Your bag</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
