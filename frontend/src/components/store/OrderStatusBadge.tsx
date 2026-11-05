import type { OrderStatus } from "../../lib/types";

/** Customer-facing labels, coloured with the same tones as the admin order screens. */
const LABELS: Record<OrderStatus, { label: string; tone: "amber" | "blue" | "purple" | "green" | "red" }> = {
    CREATED: { label: "Placed", tone: "amber" },
    CONFIRMED: { label: "Confirmed", tone: "blue" },
    PACKING: { label: "Packing", tone: "blue" },
    SHIPPED: { label: "Shipped", tone: "purple" },
    DISPATCHED: { label: "Out for delivery", tone: "purple" },
    DELIVERED: { label: "Delivered", tone: "green" },
    CANCELLED: { label: "Cancelled", tone: "red" },
    RETURNED: { label: "Returned", tone: "red" },
};

export default function OrderStatusBadge({ status }: { status?: OrderStatus }) {
    if (!status) return null;
    const { label, tone } = LABELS[status] ?? { label: status, tone: "amber" };
    return <span className={`pill tone-${tone} ml-status`}>{label}</span>;
}
