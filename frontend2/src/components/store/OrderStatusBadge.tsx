import type { OrderStatus } from "../../lib/types";

const LABELS: Record<OrderStatus, { label: string; tone: "neutral" | "info" | "ok" | "warn" | "danger" }> = {
    CREATED: { label: "Placed", tone: "neutral" },
    CONFIRMED: { label: "Confirmed", tone: "info" },
    PACKING: { label: "Packing", tone: "info" },
    SHIPPED: { label: "Shipped", tone: "info" },
    DISPATCHED: { label: "Out for delivery", tone: "info" },
    DELIVERED: { label: "Delivered", tone: "ok" },
    CANCELLED: { label: "Cancelled", tone: "danger" },
    RETURNED: { label: "Returned", tone: "warn" },
};

export default function OrderStatusBadge({ status }: { status?: OrderStatus }) {
    if (!status) return null;
    const { label, tone } = LABELS[status] ?? { label: status, tone: "neutral" };
    return <span className={`ml-status ml-status--${tone}`}>{label}</span>;
}