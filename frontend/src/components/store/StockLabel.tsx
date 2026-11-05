const LOW_STOCK = 10;

export default function StockLabel({ quantity }: { quantity: number }) {
  if (quantity <= 0) return <span className="ml-stock ml-stock--out">Out of stock</span>;
  if (quantity <= LOW_STOCK) return <span className="ml-stock ml-stock--low">Only {quantity} left</span>;
  return <span className="ml-stock ml-stock--ok">In stock</span>;
}
