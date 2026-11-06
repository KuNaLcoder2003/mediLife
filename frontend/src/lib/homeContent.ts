import { SELLER } from "./config";
import { formatPrice } from "./format";


export const HOME_CONTENT = {
  freeDeliveryAbove: 499,
  bulkAbove: 10000,
  supportPhone: "1800-XXX-XXXX",
  supportHours: "8am–10pm",
  licenceNo: "", 
  lowStockAt: 20, 
  prescriptionHref: "/prescription", // no upload page exists
  bulkQuoteHref: SELLER.email ? `mailto:${SELLER.email}` : "/products",
  searchParam: "q",
};

export const freeDeliveryText = () => `Free delivery on orders above ${formatPrice(HOME_CONTENT.freeDeliveryAbove)}`;