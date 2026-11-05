import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { SELLER } from "../../lib/config";
import { formatDate, formatPrice } from "../../lib/format";
import type { Order } from "../../lib/types";

/*
 * This module is loaded on demand (via renderInvoice.tsx / downloadInvoice.ts),
 * so @react-pdf/renderer never ends up in the main bundle.
 *
 * Fonts: the built-in Helvetica only covers Latin-1. If your currency symbol is
 * outside it (₹, for example), register a font that has it:
 *   Font.register({ family: "Inter", src: "/fonts/Inter-Regular.ttf" })
 * and set fontFamily: "Inter" on styles.page.
 */

// Never hyphenate: IDs like 01K3ZQ8M… must not be split across lines.
Font.registerHyphenationCallback((word) => [word]);

/** A4 is 595 × 842 pt. The footer is placed from the top because `bottom` is unreliable on fixed elements. */
const A4_HEIGHT = 842;

export interface InvoiceCustomer {
    name: string;
    email: string;
}

const INK = "#13302b";
const MUTED = "#5a6f6a";
const LINE = "#dae4e1";
const BRAND = "#0d6e5f";

const styles = StyleSheet.create({
    page: { padding: 48, fontSize: 10, color: INK, fontFamily: "Helvetica", lineHeight: 1.4 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 },
    brand: { fontSize: 20, fontFamily: "Helvetica-Bold", color: BRAND },
    sellerLine: { color: MUTED, marginTop: 2 },
    title: { fontSize: 22, fontFamily: "Helvetica-Bold", textAlign: "right", marginBottom: 10 },
    metaRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4 },
    metaLabel: { color: MUTED, width: 70, textAlign: "right", marginRight: 8 },
    metaValue: { width: 180, textAlign: "right" },
    parties: { flexDirection: "row", marginBottom: 28 },
    party: { flex: 1, paddingRight: 16 },
    partyLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: MUTED, letterSpacing: 1, marginBottom: 6 },
    partyName: { fontFamily: "Helvetica-Bold", marginBottom: 2 },
    table: { borderTopWidth: 1, borderTopColor: INK },
    row: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: LINE },
    headCell: { fontSize: 8, fontFamily: "Helvetica-Bold", color: MUTED, letterSpacing: 1 },
    colItem: { flex: 1, paddingRight: 8 },
    colQty: { width: 40, textAlign: "right" },
    colPrice: { width: 80, textAlign: "right" },
    colAmount: { width: 90, textAlign: "right" },
    itemName: { fontFamily: "Helvetica-Bold" },
    totals: { marginTop: 16, alignSelf: "flex-end", width: 220 },
    totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
    grandTotal: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 6,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: INK,
        fontSize: 12,
        fontFamily: "Helvetica-Bold",
    },
    note: { marginTop: 24, color: MUTED, fontSize: 9 },
    footer: {
        position: "absolute",
        top: A4_HEIGHT - 56,
        left: 48,
        right: 48,
        flexDirection: "row",
        justifyContent: "space-between",
        color: MUTED,
        fontSize: 8,
        borderTopWidth: 1,
        borderTopColor: LINE,
        paddingTop: 8,
    },
});

/** Intl can emit narrow/no-break spaces that the built-in PDF fonts can't draw. */
const pdfText = (value: string) => value.replace(/[\u202f\u00a0]/g, " ");
const money = (value: number) => pdfText(formatPrice(value));

function MetaRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{label}</Text>
            <Text style={styles.metaValue}>{value}</Text>
        </View>
    );
}

export default function InvoiceDocument({ order, customer }: { order: Order; customer: InvoiceCustomer }) {
    const lines = order.orderedProducts ?? [];
    const priced = lines.length > 0 && lines.every((l) => typeof l.quantity === "number" && typeof l.unitPrice === "number");
    const address = order.address;

    return (
        <Document title={`Invoice ${order.id}`} author={SELLER.name} subject="Order invoice">
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.brand}>{SELLER.name}</Text>
                        {SELLER.addressLines.map((line) => (
                            <Text key={line} style={styles.sellerLine}>
                                {line}
                            </Text>
                        ))}
                        {SELLER.email ? <Text style={styles.sellerLine}>{SELLER.email}</Text> : null}
                        {SELLER.taxId ? <Text style={styles.sellerLine}>Tax ID: {SELLER.taxId}</Text> : null}
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.title}>Invoice</Text>
                        <MetaRow label="Invoice no." value={order.id} />
                        <MetaRow label="Date" value={pdfText(formatDate(order.createdAt))} />
                        {order.trackingId ? <MetaRow label="Tracking" value={order.trackingId} /> : null}
                    </View>
                </View>

                <View style={styles.parties}>
                    <View style={styles.party}>
                        <Text style={styles.partyLabel}>BILLED TO</Text>
                        <Text style={styles.partyName}>{customer.name}</Text>
                        <Text>{customer.email}</Text>
                    </View>
                    <View style={styles.party}>
                        <Text style={styles.partyLabel}>SHIPPED TO</Text>
                        <Text style={styles.partyName}>{customer.name}</Text>
                        <Text>{address.addressLine1}</Text>
                        {address.addressLine2 ? <Text>{address.addressLine2}</Text> : null}
                        <Text>{address.postalCode}</Text>
                    </View>
                </View>

                <View style={styles.table}>
                    <View style={styles.row}>
                        <Text style={[styles.headCell, styles.colItem]}>ITEM</Text>
                        {priced && (
                            <>
                                <Text style={[styles.headCell, styles.colQty]}>QTY</Text>
                                <Text style={[styles.headCell, styles.colPrice]}>UNIT PRICE</Text>
                                <Text style={[styles.headCell, styles.colAmount]}>AMOUNT</Text>
                            </>
                        )}
                    </View>
                    {lines.map((line) => (
                        <View key={line.product.id} style={styles.row} wrap={false}>
                            <View style={styles.colItem}>
                                <Text style={styles.itemName}>{line.product.productName}</Text>
                            </View>
                            {priced && (
                                <>
                                    <Text style={styles.colQty}>{line.quantity}</Text>
                                    <Text style={styles.colPrice}>{money(line.unitPrice!)}</Text>
                                    <Text style={styles.colAmount}>{money(line.unitPrice! * line.quantity!)}</Text>
                                </>
                            )}
                        </View>
                    ))}
                </View>

                <View style={styles.totals}>
                    <View style={styles.grandTotal}>
                        <Text>Total paid</Text>
                        <Text>{money(order.orderTotal)}</Text>
                    </View>
                </View>

                <Text style={styles.note}>Thank you for shopping with {SELLER.name}.</Text>

                <View style={styles.footer} fixed>
                    <Text>
                        {SELLER.name} · Invoice {order.id}
                    </Text>
                    <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
                </View>
            </Page>
        </Document>
    );
}