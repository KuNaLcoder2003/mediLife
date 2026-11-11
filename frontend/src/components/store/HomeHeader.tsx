import { useState, type FormEvent } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import type { Category } from "../../lib/api";
import { firstName } from "../../lib/format";
import BrandLogo from "./auth/BrandLogo";
import { CartIcon, ChevronDownIcon, DocIcon, SearchIcon } from "./auth/Icons";
import { freeDeliveryText, HOME_CONTENT } from "../../lib/homeContent";

interface Props {
  categories: Category[];
  cartCount: number;
  signedIn: boolean;
  userName?: string;
}

export default function HomeHeader({ categories, cartCount, signedIn, userName }: Props) {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [category, setCategory] = useState("");

  const search = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (text.trim()) params.set(HOME_CONTENT.searchParam, text.trim());
    if (category) params.set("category", category);
    const qs = params.toString();
    navigate(qs ? `/products?${qs}` : "/products");
  };

  const name = firstName(userName);
  const initials = (userName ?? "").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="hm-header">
      <div className="hm-topbar">
        <div className="hm-wide hm-topbar__in">
          <span>{freeDeliveryText()}{HOME_CONTENT.licenceNo ? " · Licensed online pharmacy" : ""}</span>
          <span>Need help? Call {HOME_CONTENT.supportPhone} · {HOME_CONTENT.supportHours}</span>
        </div>
      </div>

      <div className="hm-wide hm-header__main">
        <Link to="/" aria-label="MedLife home"><BrandLogo /></Link>

        <form className="hm-search" onSubmit={search} role="search">
          <label className="hm-search__cat">
            <span className="hm-sr">Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All</option>
              {categories.map((c) => <option key={c.id} value={c.category}>{c.category}</option>)}
            </select>
            <ChevronDownIcon />
          </label>
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search for BP monitors, gloves, glucometers…"
            aria-label="Search products"
          />
          <button type="submit" className="hm-search__go" aria-label="Search"><SearchIcon /></button>
        </form>

        <nav className="hm-actions" aria-label="Account">
          <Link to={HOME_CONTENT.prescriptionHref} className="hm-action"><DocIcon /><span>Upload Rx</span></Link>
          <Link to="/checkout" className="hm-action">
            <CartIcon /><span>Cart</span>
            {cartCount > 0 && <b className="hm-cart-count">{cartCount}</b>}
          </Link>
          {signedIn ? (
            <Link to="/account" className="hm-user">
              <span className="hm-avatar">{initials || "•"}</span>
              <span>{name ? `Hi, ${name}` : "Account"}</span>
              <ChevronDownIcon />
            </Link>
          ) : (
            <Link to="/login" className="hm-user"><span>Sign in</span></Link>
          )}
        </nav>
      </div>

      <nav className="hm-catnav" aria-label="Categories">
        <div className="hm-wide hm-catnav__in">
          <NavLink to="/products" end className="hm-catnav__all">All categories</NavLink>
          {categories.slice(0, 6).map((c) => (
            <Link key={c.id} to={`/products?category=${encodeURIComponent(c.category)}`}>{c.category}</Link>
          ))}
          <Link to="/products?offer=1" className="hm-catnav__offers">Offers</Link>
        </div>
      </nav>
    </header>
  );
}