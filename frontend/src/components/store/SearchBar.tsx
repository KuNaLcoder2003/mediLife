import { useId, useState, type FormEvent, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useQuery } from "../../hooks/useQuery";
import { productApi } from "../../lib/api";
import Icon from "./Icon";
import Price from "./Price";
import ProductImage from "./ProductImage";

interface SearchBarProps {
  variant?: "hero" | "compact";
  initialQuery?: string;
}

/** Search box with live product suggestions (combobox pattern). Submitting opens /products?q=… */
export default function SearchBar({ variant = "compact", initialQuery = "" }: SearchBarProps) {
  const navigate = useNavigate();
  const listId = useId();
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const term = useDebouncedValue(query.trim(), 250);
  const enabled = open && term.length >= 2;
  const { data, previous } = useQuery(enabled ? `suggest:${term}` : null, (signal) => productApi.list(term, signal));
  const suggestions = enabled ? (data ?? previous ?? []).slice(0, 6) : [];
  const showList = open && suggestions.length > 0;

  const goToResults = (q: string) => {
    setOpen(false);
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : "/products");
  };

  const goToProduct = (id: string) => {
    setOpen(false);
    navigate(`/products/${id}`);
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const picked = showList && active >= 0 ? suggestions[active] : undefined;
    if (picked) goToProduct(picked.id);
    else goToResults(query.trim());
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && suggestions.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp" && suggestions.length) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <form
      role="search"
      className={`ml-search ml-search--${variant}`}
      onSubmit={onSubmit}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <div className="ml-search-field">
        <Icon name="search" size={variant === "hero" ? 22 : 18} />
        <input
          type="search"
          value={query}
          placeholder="Search medicines, vitamins, first aid…"
          aria-label="Search products"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <button type="submit" className="ml-btn ml-btn--primary">
          Search
        </button>
      </div>

      {showList && (
        <ul className="ml-suggest" id={listId} role="listbox" aria-label="Suggested products">
          {suggestions.map((p, i) => (
            <li
              key={p.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? "is-active" : undefined}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => goToProduct(p.id)}
              onMouseEnter={() => setActive(i)}
            >
              <ProductImage src={p.images?.[0]?.imageUrl} alt="" className="ml-suggest-img" />
              <span className="ml-suggest-name">{p.productName}</span>
              <Price price={p.price} discount={p.discount} size="sm" />
            </li>
          ))}
          <li
            role="option"
            aria-selected={false}
            className="ml-suggest-all"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => goToResults(query.trim())}
          >
            See all results for “{query.trim()}”
          </li>
        </ul>
      )}
    </form>
  );
}
