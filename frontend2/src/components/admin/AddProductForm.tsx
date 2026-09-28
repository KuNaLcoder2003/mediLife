import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { productsApi } from "./api";
import type { Category, CreatedProduct } from "./types";
import { discountedPrice, errorMessage, formatPrice } from "./utils";
import CategoryPicker from "./CategoryPicker";

interface AddProductFormProps {
    categories: Category[];
    categoriesError: string | null;
    onReloadCategories: () => Promise<Category[]>;
    onCreated: (product: CreatedProduct) => void;
    onCancel: () => void;
}

type FieldName = "productName" | "productDescription" | "price" | "quantity" | "discount" | "categoryId";
type FormValues = Record<FieldName, string>;
type FormErrors = Partial<Record<FieldName, string>>;

const EMPTY: FormValues = {
    productName: "",
    productDescription: "",
    price: "",
    quantity: "",
    discount: "0",
    categoryId: "",
};

const FIELD_ORDER: FieldName[] = ["productName", "productDescription", "price", "discount", "quantity", "categoryId"];

function validate(v: FormValues): FormErrors {
    const errors: FormErrors = {};
    const price = Number(v.price);
    const quantity = Number(v.quantity);
    const discount = Number(v.discount || 0);

    if (!v.productName.trim()) errors.productName = "Enter a product name.";
    else if (v.productName.trim().length > 120) errors.productName = "Keep the name under 120 characters.";

    if (!v.productDescription.trim()) errors.productDescription = "Add a short description.";

    if (v.price.trim() === "" || Number.isNaN(price)) errors.price = "Enter a price.";
    else if (price <= 0) errors.price = "Price must be more than 0.";

    if (Number.isNaN(discount) || discount < 0 || discount > 100) errors.discount = "Use a value from 0 to 100.";

    if (v.quantity.trim() === "" || !Number.isInteger(quantity)) errors.quantity = "Enter a whole number.";
    else if (quantity < 0) errors.quantity = "Stock can't be negative.";

    if (!v.categoryId) errors.categoryId = "Choose a category.";

    return errors;
}

const fieldId = (name: FieldName) => `ap-field-${name}`;

export default function AddProductForm({
    categories,
    categoriesError,
    onReloadCategories,
    onCreated,
    onCancel,
}: AddProductFormProps) {
    const [values, setValues] = useState<FormValues>(EMPTY);
    const [errors, setErrors] = useState<FormErrors>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const setField = (name: FieldName, value: string) => {
        setValues((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    };

    const bind = (name: FieldName) => ({
        id: fieldId(name),
        name,
        value: values[name],
        onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setField(name, e.target.value),
        "aria-invalid": errors[name] ? true : undefined,
        "aria-describedby": errors[name] ? `${fieldId(name)}-msg` : undefined,
    });

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const found = validate(values);
        setErrors(found);
        const firstInvalid = FIELD_ORDER.find((f) => found[f]);
        if (firstInvalid) {
            document.getElementById(fieldId(firstInvalid))?.focus();
            return;
        }

        setSubmitting(true);
        setSubmitError(null);
        try {
            const product = await productsApi.create({
                productName: values.productName.trim(),
                productDescription: values.productDescription.trim(),
                price: Number(values.price),
                quantity: Number(values.quantity),
                discount: Number(values.discount || 0),
                reservedQuantity: 0,
                categoryId: values.categoryId,
            });
            onCreated(product);
        } catch (err) {
            setSubmitError(errorMessage(err, "The product couldn't be saved."));
            setSubmitting(false);
        }
    };

    const price = Number(values.price);
    const discount = Number(values.discount || 0);
    const showPreview = price > 0 && discount > 0 && discount <= 100;

    return (
        <form className="ap-panel ap-form" onSubmit={handleSubmit} noValidate>
            <div className="ap-form-grid">
                <Field name="productName" label="Product name" error={errors.productName} wide>
                    <input className="ap-input" type="text" autoComplete="off" autoFocus {...bind("productName")} />
                </Field>

                <Field
                    name="productDescription"
                    label="Description"
                    hint="What customers see on the product page."
                    error={errors.productDescription}
                    wide
                >
                    <textarea className="ap-input" rows={4} {...bind("productDescription")} />
                </Field>

                <Field name="price" label="Price" error={errors.price}>
                    <input className="ap-input" type="number" inputMode="decimal" min="0" step="0.01" {...bind("price")} />
                </Field>

                <Field name="discount" label="Discount (%)" error={errors.discount}>
                    <input className="ap-input" type="number" inputMode="decimal" min="0" max="100" step="0.5" {...bind("discount")} />
                </Field>

                <Field name="quantity" label="Stock quantity" error={errors.quantity}>
                    <input className="ap-input" type="number" inputMode="numeric" min="0" step="1" {...bind("quantity")} />
                </Field>

                {showPreview && (
                    <p className="ap-preview ap-span-all">
                        Customers pay <strong>{formatPrice(discountedPrice(price, discount))}</strong> instead of{" "}
                        {formatPrice(price)}.
                    </p>
                )}

                <Field name="categoryId" label="Category" error={errors.categoryId} wide>
                    <CategoryPicker
                        id={fieldId("categoryId")}
                        categories={categories}
                        value={values.categoryId}
                        onChange={(id) => setField("categoryId", id)}
                        onReload={onReloadCategories}
                        loadError={categoriesError}
                        invalid={Boolean(errors.categoryId)}
                    />
                </Field>
            </div>

            {submitError && (
                <div className="ap-alert ap-alert--error" role="alert">
                    {submitError}
                </div>
            )}

            <div className="ap-form-footer">
                <button type="button" className="ap-btn ap-btn--ghost" onClick={onCancel} disabled={submitting}>
                    Cancel
                </button>
                <button type="submit" className="ap-btn ap-btn--primary" disabled={submitting}>
                    {submitting ? "Saving…" : "Save and add images"}
                </button>
            </div>
        </form>
    );
}

interface FieldProps {
    name: FieldName;
    label: string;
    hint?: string;
    error?: string;
    wide?: boolean;
    children: ReactNode;
}

function Field({ name, label, hint, error, wide, children }: FieldProps) {
    const id = fieldId(name);
    return (
        <div className={`ap-field${error ? " has-error" : ""}${wide ? " ap-span-all" : ""}`}>
            <label htmlFor={id}>{label}</label>
            {children}
            {error ? (
                <p className="ap-field-error" id={`${id}-msg`}>
                    {error}
                </p>
            ) : hint ? (
                <p className="ap-hint">{hint}</p>
            ) : null}
        </div>
    );
}