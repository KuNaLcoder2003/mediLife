import { useState } from "react";
import { useAuth } from "../../auth/auth-context";
import type { Order } from "../../lib/types";
import Icon from "./Icon";
import { downloadInvoice } from "./DownloadInvoice";

interface InvoiceButtonProps {
    order: Order;
    variant?: "ghost" | "primary";
    size?: "sm" | "md";
}

export default function InvoiceButton({ order, variant = "ghost", size = "sm" }: InvoiceButtonProps) {
    const { user } = useAuth();
    const [status, setStatus] = useState<"idle" | "working" | "error">("idle");

    const onClick = async () => {
        setStatus("working");
        try {
            await downloadInvoice(order, { name: user?.name ?? "", email: user?.email ?? "" });
            setStatus("idle");
        } catch (err) {
            console.error("Invoice generation failed", err);
            setStatus("error");
        }
    };

    return (
        <span className="ml-invoice-btn">
            <button
                type="button"
                className={`ml-btn ml-btn--${variant}${size === "sm" ? " ml-btn--sm" : ""}`}
                onClick={() => void onClick()}
                disabled={status === "working"}
            >
                <Icon name="download" size={16} />
                {status === "working" ? "Preparing PDF…" : "Download invoice"}
            </button>
            {status === "error" && (
                <span className="ml-field-error" role="alert">
                    The invoice couldn't be created. Try again.
                </span>
            )}
        </span>
    );
}