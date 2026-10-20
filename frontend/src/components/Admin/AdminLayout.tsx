import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AdminLayout() {
  return (
    <div className="admin">
      <Sidebar />
      <div className="admin__main">
        <Topbar />
        <main className="admin__content"><Outlet /></main>
      </div>
    </div>
  );
}