import type { Order, OrderStatus } from "./types";

/** Orders can be cancelled until they're packed. Keep in sync with the server's cancel handler. */
export const CANCELLABLE_STATUSES: readonly OrderStatus[] = ["CREATED", "CONFIRMED", "PACKING"];

export function canCancel(order: Pick<Order, "status">): boolean {
    return order.status !== undefined && CANCELLABLE_STATUSES.includes(order.status);
}