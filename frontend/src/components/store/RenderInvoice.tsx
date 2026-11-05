import { pdf } from "@react-pdf/renderer";
import type { Order } from "../../lib/types";
import InvoiceDocument, { type InvoiceCustomer } from "./InvoiceDocument";

export async function createInvoiceBlob(order: Order, customer: InvoiceCustomer): Promise<Blob> {
    return pdf(<InvoiceDocument order={order} customer={customer} />).toBlob();
}