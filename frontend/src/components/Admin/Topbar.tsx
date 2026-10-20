import { BellIcon, SearchIcon } from "../Icons";

export default function Topbar() {
  return (
    <header className="topbar">
      <label className="search">
        <SearchIcon />
        <input placeholder="Search products, orders, tracking IDs" />
      </label>
      <div className="topbar__right">
        <button className="icon-btn" aria-label="Notifications"><BellIcon /><i /></button>
        <div className="user">
          <span className="avatar">SA</span>
          <div><strong>Store Admin</strong><small>Super admin</small></div>
        </div>
      </div>
    </header>
  );
}