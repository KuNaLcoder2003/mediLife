import { Link } from "react-router-dom";
import { STORE_NAME } from "../../lib/config";
import { HOME_CONTENT } from "../../lib/homeContent";

export default function HomeFooter() {
  return (
    <footer className="hm-footer">
      <div className="hm-wide">
        <div className="hm-footer__cols">
          <div>
            <strong className="hm-footer__brand">{STORE_NAME}</strong>
            <p>Genuine medical supplies from a licensed pharmacy.</p>
          </div>
          <div>
            <h4>Shop</h4>
            <Link to="/products">All products</Link>
            <Link to="/products?offer=1">Offers</Link>
            <a href={HOME_CONTENT.bulkQuoteHref}>Bulk orders</a>
          </div>
          <div>
            <h4>Help</h4>
            <Link to="/account">Track an order</Link>
            <a href="#">Returns &amp; refunds</a>
            <a href="#">Contact us</a>
          </div>
          <div>
            <h4>Company</h4>
            <a href="#">About</a>
            <a href="#">Terms</a>
            <a href="#">Privacy</a>
          </div>
        </div>
        <div className="hm-footer__base">
          <span>© {new Date().getFullYear()} {STORE_NAME}{HOME_CONTENT.licenceNo ? ` · ${HOME_CONTENT.licenceNo}` : ""}</span>
          <span>Prices include GST</span>
        </div>
      </div>
    </footer>
  );
}