import { useEffect, useId, useRef, type ReactNode } from "react";

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    children: ReactNode;
    confirmLabel: string;
    cancelLabel: string;
    busyLabel?: string;
    busy?: boolean;
    error?: string | null;
    tone?: "danger" | "primary";
    onConfirm: () => void;
    onClose: () => void;
}

/**
 * Modal confirmation built on the native <dialog> element, which gives focus
 * trapping, Escape to close and a backdrop for free. The safe action comes first
 * so it receives focus when the dialog opens.
 */
export default function ConfirmDialog({
    open,
    title,
    children,
    confirmLabel,
    cancelLabel,
    busyLabel = "Working…",
    busy = false,
    error,
    tone = "danger",
    onConfirm,
    onClose,
}: ConfirmDialogProps) {
    const ref = useRef<HTMLDialogElement>(null);
    const titleId = useId();

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    return (
        <dialog
            ref={ref}
            className="ml-dialog"
            aria-labelledby={titleId}
            onCancel={(e) => {
                // Escape key: let the parent decide, and never close mid-request
                e.preventDefault();
                if (!busy) onClose();
            }}
            onClick={(e) => {
                // Click on the backdrop (outside the content box)
                if (e.target === e.currentTarget && !busy) onClose();
            }}
        >
            <div className="ml-dialog-body">
                <h2 id={titleId}>{title}</h2>
                <div className="ml-dialog-text">{children}</div>
                {error && (
                    <div className="ml-alert ml-alert--error" role="alert">
                        {error}
                    </div>
                )}
                <div className="ml-dialog-actions">
                    <button type="button" className="ml-btn ml-btn--ghost" onClick={onClose} disabled={busy}>
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        className={`ml-btn ml-btn--${tone === "danger" ? "danger" : "primary"}`}
                        onClick={onConfirm}
                        disabled={busy}
                    >
                        {busy ? busyLabel : confirmLabel}
                    </button>
                </div>
            </div>
        </dialog>
    );
}