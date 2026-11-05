import type { Order } from "../../lib/types";
import type { InvoiceCustomer } from "./InvoiceDocument";

/** Builds the PDF in the browser and saves it. react-pdf is fetched only on first use. */
export async function downloadInvoice(order: Order, customer: InvoiceCustomer): Promise<void> {
    const { createInvoiceBlob } = await import("./RenderInvoice");
    const blob = await createInvoiceBlob(order, customer);

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoice-${order.id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}