import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AdminLayout() {
  const { pathname } = useLocation();
  //The Add product screens have their own top bar, so the search topbar is hidden there
  const ownTopbar = pathname.startsWith("/admin/products")|| pathname.startsWith("/admin/orders");;
  return (
    <div className="admin">
      <Sidebar />
      <div className="admin__main">
        {!ownTopbar && <Topbar />}
        <main className={ownTopbar ? "admin__content admin__content--flush" : "admin__content"}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}