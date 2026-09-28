import { useState, type KeyboardEvent } from "react";
import { productsApi } from "./api";
import type { Category } from "./types";
import { errorMessage } from "./utils";
import Icon from "./Icon";

interface CategoryPickerProps {
    id: string;
    categories: Category[];
    value: string;
    onChange: (categoryId: string) => void;
    onReload: () => Promise<Category[]>;
    loadError: string | null;
    invalid?: boolean;
}

export default function CategoryPicker({
    id,
    categories,
    value,
    onChange,
    onReload,
    loadError,
    invalid,
}: CategoryPickerProps) {
    const [adding, setAdding] = useState(false);
    const [name, setName] = useState("");
    const [saving, setSaving] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);

    const closeAdd = () => {
        setAdding(false);
        setName("");
        setAddError(null);
    };

    const save = async () => {
        const trimmed = name.trim();
        if (!trimmed) {
            setAddError("Enter a category name.");
            return;
        }
        const lower = trimmed.toLowerCase();
        const existing = categories.find((c) => c.category.toLowerCase() === lower);
        if (existing) {
            onChange(existing.id);
            closeAdd();
            return;
        }

        setSaving(true);
        setAddError(null);
        try {
            await productsApi.createCategory(trimmed);
            // The API doesn't return the new row, so reload and pick the newest match.
            const list = await onReload();
            const match = list
                .filter((c) => c.category.toLowerCase() === lower)
                .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))[0];
            if (match) onChange(match.id);
            closeAdd();
        } catch (err) {
            setAddError(errorMessage(err, "The category couldn't be created."));
        } finally {
            setSaving(false);
        }
    };

    // Enter here should save the category, not submit the product form.
    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            void save();
        } else if (e.key === "Escape") {
            e.preventDefault();
            closeAdd();
        }
    };

    if (adding) {
        return (
            <div className="ap-category">
                <div className="ap-inline-row">
                    <input
                        id={id}
                        className="ap-input"
                        type="text"
                        placeholder="New category name"
                        value={name}
                        autoFocus
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={onKeyDown}
                        aria-invalid={addError ? true : undefined}
                    />
                    <button type="button" className="ap-btn ap-btn--primary" onClick={() => void save()} disabled={saving}>
                        {saving ? "Adding…" : "Add category"}
                    </button>
                    <button type="button" className="ap-btn ap-btn--ghost" onClick={closeAdd} disabled={saving}>
                        Cancel
                    </button>
                </div>
                {addError && <p className="ap-field-error">{addError}</p>}
            </div>
        );
    }

    return (
        <div className="ap-category">
            <div className="ap-inline-row">
                <select
                    id={id}
                    className="ap-input"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    aria-invalid={invalid ? true : undefined}
                >
                    <option value="" disabled>
                        {categories.length ? "Select a category" : "No categories yet"}
                    </option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.category}
                        </option>
                    ))}
                </select>
                <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setAdding(true)}>
                    <Icon name="plus" size={15} /> New category
                </button>
            </div>
            {loadError && (
                <p className="ap-field-error">
                    {loadError}{" "}
                    <button type="button" className="ap-link" onClick={() => void onReload()}>
                        Retry
                    </button>
                </p>
            )}
        </div>
    );
}