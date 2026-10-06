import { useState } from "react";
import { orderApi } from "../../lib/api";
import { errorMessage, formatPrice, shortId } from "../../lib/format";
import type { Order } from "../../lib/types";
import ConfirmDialog from "./ConfirmDialog";

interface CancelOrderButtonProps {
    order: Order;
    onCancelled: (order: Order) => void;
    block?: boolean;
}

export default function CancelOrderButton({ order, onCancelled, block = false }: CancelOrderButtonProps) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Units, matching the "Items (n)" count on the order page
    const items = order.orderedProducts.reduce((sum, line) => sum + (line.quantity ?? 1), 0);

    const confirm = async () => {
        setBusy(true);
        setError(null);
        try {
            await orderApi.cancel(order.id);
            setOpen(false);
            onCancelled(order);
        } catch (err) {
            setError(errorMessage(err, "The order couldn't be cancelled. Try again."));
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <button
                type="button"
                className={`ml-btn ml-btn--danger-ghost ml-btn--sm${block ? " ml-btn--block" : ""}`}
                onClick={() => {
                    setError(null);
                    setOpen(true);
                }}
            >
                Cancel order
            </button>

            <ConfirmDialog
                open={open}
                title={`Cancel order #${shortId(order.id)}?`}
                confirmLabel="Cancel order"
                cancelLabel="Keep order"
                busyLabel="Cancelling…"
                busy={busy}
                error={error}
                onConfirm={() => void confirm()}
                onClose={() => setOpen(false)}
            >
                <p>
                    {items} {items === 1 ? "item" : "items"}, {formatPrice(order.orderTotal)}. We'll stop processing this order.
                    This can't be undone.
                </p>
            </ConfirmDialog>
        </>
    );
}