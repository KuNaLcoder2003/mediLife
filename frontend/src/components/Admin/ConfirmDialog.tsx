import { useEffect } from "react";
import { AlertIcon } from "../store/auth/Icons";

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  busyLabel?: string;
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  busyLabel = "Deleting…",
  busy = false,
  error,
  onConfirm,
  onCancel,
}: Props) {
  // Esc to closee
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  return (
    <div
      className="modal"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={() => { if (!busy) onCancel(); }}
    >
      <div className="modal__box" onClick={(e) => e.stopPropagation()}>
        <span className="confirm__icon"><AlertIcon /></span>
        <h2 id="confirm-title">{title}</h2>
        <p className="muted">{message}</p>
        {error && <p className="field-error">{error}</p>}
        <div className="modal__actions">
          <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="btn-delete" onClick={onConfirm} disabled={busy}>
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}