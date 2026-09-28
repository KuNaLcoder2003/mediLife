import { useState } from "react";
import Sidebar, { type NavTab } from "./SideBar";
import ProductsTab from "./ProductsTab";
import type { TabId } from "./types";
import "./Admin.css";

const TABS: NavTab[] = [
    { id: "products", label: "Products", icon: "box", ready: true },
    { id: "orders", label: "Orders", icon: "receipt", ready: false },
    { id: "payments", label: "Payments", icon: "card", ready: false },
    { id: "shipments", label: "Shipments", icon: "truck", ready: false },
    { id: "reports", label: "Reports", icon: "chart", ready: false },
];

export default function AdminPanel() {
    const [activeTab, setActiveTab] = useState<TabId>("products");

    return (
        <div className="ap-shell">
            <Sidebar tabs={TABS} active={activeTab} onSelect={setActiveTab} />
            <main className="ap-main">
                {activeTab === "products" && <ProductsTab />}
                {/* Add <OrdersTab />, <PaymentsTab /> etc. here as they're built, then flip `ready` above. */}
            </main>
        </div>
    );
}