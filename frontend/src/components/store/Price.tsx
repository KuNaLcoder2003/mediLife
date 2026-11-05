import { discountPct, formatPrice, unitPrice } from "../../lib/format";

interface PriceProps {
  price: number;
  discount: number | null | undefined;
  size?: "sm" | "md" | "lg";
}

export default function Price({ price, discount, size = "md" }: PriceProps) {
  const pct = discountPct(discount);
  return (
    <span className={`ml-price ml-price--${size}`}>
      <span className="ml-price-now">{formatPrice(unitPrice(price, discount))}</span>
      {pct > 0 && (
        <>
          <s className="ml-price-was">
            <span className="ml-sr">Was </span>
            {formatPrice(price)}
          </s>
          <span className="ml-price-off">{Number(pct.toFixed(1))}% off</span>
        </>
      )}
    </span>
  );
}
