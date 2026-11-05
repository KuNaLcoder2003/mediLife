import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/auth-context";
import { initials } from "../../lib/customers";

/** The signed-in person in the admin header, with a sign-out menu. */
export default function AdminUser({ detailed = false }: { detailed?: boolean }) {
  const { status, user, role, signOut } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  if (status === "checking") return <div className="user"><span className="avatar">…</span></div>;

  if (status === "anonymous" || !user) {
    return (
      <Link to="/login" state={{ from: pathname }} className="user user--link">
        <span className="avatar">?</span>
        <strong>Sign in</strong>
      </Link>
    );
  }

  const roleLabel = role === "COMPANY" ? "Store admin" : role ? role.charAt(0) + role.slice(1).toLowerCase() : "Signed in";

  return (
    <div className="user-menu" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <button type="button" className="user" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="avatar">{initials(user.name)}</span>
        {detailed ? (
          <div><strong>{user.name}</strong><small>{roleLabel}</small></div>
        ) : (
          <strong>{user.name}</strong>
        )}
      </button>
      {open && (
        <div className="user-menu__pop" role="menu">
          <p className="user-menu__email">{user.email}</p>
          <Link role="menuitem" to="/account" onClick={() => setOpen(false)}>My account</Link>
          <button role="menuitem" type="button" onClick={() => { setOpen(false); void signOut(); }}>Sign out</button>
        </div>
      )}
    </div>
  );
}
