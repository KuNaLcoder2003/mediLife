import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BellIcon, SearchIcon } from "../Icons";
import { productApi, type Product } from "../../lib/api";
export default function Topbar() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  // Results are saved together with the word they were searched for.
  const [found, setFound] = useState<{ word: string; items: Product[] }>({ word: "", items: [] });

  const word = q.trim();
  // null = results for this word haven't arrived yet ("Searching…")
  const results = found.word === word ? found.items : null;
  useEffect(() => {
    if (!word) return;
    let ignore = false;
    const t = setTimeout(() => {
      productApi.list(word)
        .then((r) => {
          if (ignore) return;
          const lower = word.toLowerCase();
          setFound({ word, items: r.filter((p) => p.productName.toLowerCase().includes(lower)) });
        })
        .catch(() => { if (!ignore) setFound({ word, items: [] }); });
    }, 300);
    return () => { ignore = true; clearTimeout(t); };
  }, [word]);


  return (
    <header className="topbar">
      <div className="search">
        <SearchIcon />
        <input
          placeholder="Search products, orders, tracking IDs"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {open && q.trim() && (
          <ul className="search__results">
            {results === null && <li className="empty">Searching…</li>}
            {results?.length === 0 && <li className="empty">No products found</li>}
            {results?.map((p) => (
              <li key={p.id}>
                <Link to="/admin/products" onClick={() => setQ("")}>
                  {p.productName} <small>Qty {p.quantity}</small>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

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
