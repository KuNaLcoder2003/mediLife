import { Link, NavLink } from "react-router-dom";
import BrandLogo from "../store/auth/BrandLogo";
import { GridIcon, BoxIcon, TagIcon, ClipboardIcon, UsersIcon, ChartIcon, SlidersIcon, ExternalIcon } from "../store/auth/Icons";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: <GridIcon />, end: true },
  { to: "/admin/products", label: "Products", icon: <BoxIcon /> },
  { to: "/admin/categories", label: "Categories", icon: <TagIcon /> },
  { to: "/admin/orders", label: "Orders", icon: <ClipboardIcon /> },
  { to: "/admin/customers", label: "Customers", icon: <UsersIcon /> },
  { to: "/admin/reports", label: "Reports", icon: <ChartIcon /> },
];

const active = ({ isActive }: { isActive: boolean }) => (isActive ? "active" : "");

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <BrandLogo />
        <span className="admin-tag">ADMIN</span>
      </div>

      <nav className="nav">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={active}>
            {n.icon}{n.label}
            {/* {n.badge && <span className="nav__badge">{n.badge}</span>} */}
          </NavLink>
        ))}
      </nav>

      <nav className="nav nav--bottom">
        <NavLink to="/admin/settings" className={active}><SlidersIcon />Settings</NavLink>
        <Link to="/"><ExternalIcon />View storefront</Link>
      </nav>
    </aside>
  );
}