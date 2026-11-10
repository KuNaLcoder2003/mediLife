import { Outlet } from "react-router-dom";
import { useAuth } from "../../auth/auth-context";
import { useCart } from "../../cart/cart-context";
import { useQuery } from "../../hooks/useQuery";
import { productApi } from "../../lib/api";
import "../../styles/product.css";
import HomeFooter from "./HomeFooter";
import HomeHeader from "./HomeHeader";

export default function StoreLayout() {
  const { status, user } = useAuth();
  const { count } = useCart();
  const categories = useQuery("layout:categories", () => productApi.categories());

  return (
    <div className="hm">
      <HomeHeader
        categories={categories.data ?? []}
        cartCount={count}
        signedIn={status === "authenticated"}
        userName={user?.name}
      />
      <main id="main">
        <Outlet />
      </main>
      <HomeFooter />
    </div>
  );
}