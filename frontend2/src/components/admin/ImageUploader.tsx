import { useEffect, useRef, useState } from "react";
import { ApiError, MAX_IMAGES_PER_UPLOAD, productsApi } from "./api";
import { errorMessage } from "./utils";
import Icon from "./Icon";

interface ImageUploaderProps {
    productId: string;
    productName: string;
    intro?: string;
    doneLabel?: string;
    onDone: () => void;
    onSkip?: () => void;
}

interface PendingImage {
    key: string;
    file: File;
    preview: string;
}

export default function ImageUploader({
    productId,
    productName,
    intro,
    doneLabel = "Done",
    onDone,
    onSkip,
}: ImageUploaderProps) {
    const [items, setItems] = useState<PendingImage[]>([]);
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [uploadedCount, setUploadedCount] = useState<number | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);
    const itemsRef = useRef<PendingImage[]>([]);

    useEffect(() => {
        itemsRef.current = items;
    }, [items]);

    // Free object URLs when the component goes away.
    useEffect(() => () => itemsRef.current.forEach((i) => URL.revokeObjectURL(i.preview)), []);

    const remaining = MAX_IMAGES_PER_UPLOAD - items.length;

    const addFiles = (incoming: FileList | null) => {
        if (!incoming || incoming.length === 0) return;
        const all = Array.from(incoming);
        const images = all.filter((f) => f.type.startsWith("image/"));
        const accepted = images.slice(0, Math.max(remaining, 0));

        const messages: string[] = [];
        if (images.length < all.length) messages.push("Only image files can be added.");
        if (accepted.length < images.length)
            messages.push(`Up to ${MAX_IMAGES_PER_UPLOAD} images per upload, so some files were left out.`);
        setNotice(messages.length ? messages.join(" ") : null);
        setError(null);

        setItems((prev) => [
            ...prev,
            ...accepted.map((file) => ({ key: crypto.randomUUID(), file, preview: URL.createObjectURL(file) })),
        ]);
    };

    const removeItem = (key: string) => {
        setItems((prev) => {
            const target = prev.find((i) => i.key === key);
            if (target) URL.revokeObjectURL(target.preview);
            return prev.filter((i) => i.key !== key);
        });
        setNotice(null);
    };

    const upload = async () => {
        if (items.length === 0) return;
        setUploading(true);
        setError(null);
        setNotice(null);
        try {
            await productsApi.uploadImages(
                productId,
                items.map((i) => i.file),
            );
            items.forEach((i) => URL.revokeObjectURL(i.preview));
            setUploadedCount(items.length);
            setItems([]);
        } catch (err) {

            const failed =
                //@ts-ignore
                err instanceof ApiError && err.details && typeof err.details === "object" && "notUploaded" in err.details
                    //@ts-ignore
                    ? (err.details as { notUploaded?: unknown[] }).notUploaded?.length
                    : undefined;
            setError(
                failed
                    ? `${errorMessage(err)} ${failed} image${failed === 1 ? "" : "s"} weren't saved. Try uploading them again.`
                    : errorMessage(err, "The images couldn't be uploaded."),
            );
        } finally {
            setUploading(false);
        }
    };

    if (uploadedCount !== null) {
        return (
            <div className="ap-panel">
                <div className="ap-success" role="status">
                    <span className="ap-success-icon">
                        <Icon name="check" size={20} />
                    </span>
                    <div>
                        <h2>
                            {uploadedCount} {uploadedCount === 1 ? "image" : "images"} added to {productName}
                        </h2>
                        <p>They now appear with the product in your list.</p>
                    </div>
                </div>
                <div className="ap-form-footer">
                    <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setUploadedCount(null)}>
                        Add more images
                    </button>
                    <button type="button" className="ap-btn ap-btn--primary" onClick={onDone}>
                        {doneLabel}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="ap-panel">
            {intro && <p className="ap-intro">{intro}</p>}

            <div
                className={`ap-dropzone${dragging ? " is-dragging" : ""}${remaining <= 0 ? " is-full" : ""}`}
                onDragOver={(e) => {
                    e.preventDefault();
                    if (remaining > 0) setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    addFiles(e.dataTransfer.files);
                }}
            >
                <Icon name="image" size={28} />
                {remaining > 0 ? (
                    <p>
                        <strong>Drop images here</strong> or{" "}
                        <button type="button" className="ap-link" onClick={() => inputRef.current?.click()}>
                            choose files
                        </button>
                    </p>
                ) : (
                    <p>
                        <strong>{MAX_IMAGES_PER_UPLOAD} images selected.</strong> Upload these first to add more.
                    </p>
                )}
                <p className="ap-hint">Up to {MAX_IMAGES_PER_UPLOAD} images per upload. JPG, PNG or WebP.</p>
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={(e) => {
                        addFiles(e.target.files);
                        e.target.value = ""; // allow re-selecting the same file
                    }}
                />
            </div>

            {notice && <p className="ap-notice">{notice}</p>}

            {items.length > 0 && (
                <ul className="ap-previews" aria-label="Selected images">
                    {items.map((item) => (
                        <li key={item.key} className="ap-preview-item">
                            <img src={item.preview} alt="" />
                            <span className="ap-preview-name">{item.file.name}</span>
                            <button
                                type="button"
                                className="ap-preview-remove"
                                onClick={() => removeItem(item.key)}
                                disabled={uploading}
                                aria-label={`Remove ${item.file.name}`}
                            >
                                <Icon name="x" size={14} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {error && (
                <div className="ap-alert ap-alert--error" role="alert">
                    {error}
                </div>
            )}

            <div className="ap-form-footer">
                {onSkip && (
                    <button type="button" className="ap-btn ap-btn--ghost" onClick={onSkip} disabled={uploading}>
                        Skip for now
                    </button>
                )}
                <button
                    type="button"
                    className="ap-btn ap-btn--primary"
                    onClick={() => void upload()}
                    disabled={uploading || items.length === 0}
                >
                    <Icon name="upload" size={16} />
                    {uploading
                        ? "Uploading…"
                        : items.length > 0
                            ? `Upload ${items.length} ${items.length === 1 ? "image" : "images"}`
                            : "Upload images"}
                </button>
            </div>
        </div>
    );
}