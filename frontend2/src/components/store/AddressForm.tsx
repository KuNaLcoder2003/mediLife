import { useState, type FormEvent } from "react";
import { userApi } from "../../lib/api";
import { errorMessage } from "../../lib/format";
import type { NewAddressInput } from "../../lib/types";

interface AddressFormProps {
  onSaved: () => void | Promise<void>;
  onCancel?: () => void;
}

type Errors = Partial<Record<keyof NewAddressInput, string>>;

export default function AddressForm({ onSaved, onCancel }: AddressFormProps) {
  const [values, setValues] = useState<NewAddressInput>({ addressLine1: "", addressLine2: "", postalCode: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const set = (field: keyof NewAddressInput, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const found: Errors = {};
    if (!values.addressLine1.trim()) found.addressLine1 = "Enter the house number and street.";
    if (!/^[A-Za-z0-9 -]{3,10}$/.test(values.postalCode.trim())) found.postalCode = "Enter a valid postal code.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    setFormError(null);
    try {
      await userApi.addAddress({
        addressLine1: values.addressLine1.trim(),
        addressLine2: values.addressLine2.trim(),
        postalCode: values.postalCode.trim(),
      });
      await onSaved();
    } catch (err) {
      setFormError(errorMessage(err, "The address couldn't be saved."));
      setSaving(false);
    }
  };

  return (
    <form className="ml-address-form" onSubmit={onSubmit} noValidate>
      <div className="ml-field">
        <label htmlFor="addr-line1">Address line 1</label>
        <input
          id="addr-line1"
          className="ml-input"
          autoComplete="address-line1"
          value={values.addressLine1}
          onChange={(e) => set("addressLine1", e.target.value)}
          aria-invalid={errors.addressLine1 ? true : undefined}
          autoFocus
        />
        {errors.addressLine1 && <p className="ml-field-error">{errors.addressLine1}</p>}
      </div>
      <div className="ml-field-row">
        <div className="ml-field">
          <label htmlFor="addr-line2">
            Address line 2 <span className="ml-optional">(optional)</span>
          </label>
          <input
            id="addr-line2"
            className="ml-input"
            autoComplete="address-line2"
            value={values.addressLine2}
            onChange={(e) => set("addressLine2", e.target.value)}
          />
        </div>
        <div className="ml-field">
          <label htmlFor="addr-postal">Postal code</label>
          <input
            id="addr-postal"
            className="ml-input"
            autoComplete="postal-code"
            value={values.postalCode}
            onChange={(e) => set("postalCode", e.target.value)}
            aria-invalid={errors.postalCode ? true : undefined}
          />
          {errors.postalCode && <p className="ml-field-error">{errors.postalCode}</p>}
        </div>
      </div>
      {formError && (
        <div className="ml-alert ml-alert--error" role="alert">
          {formError}
        </div>
      )}
      <div className="ml-form-actions">
        {onCancel && (
          <button type="button" className="ml-btn ml-btn--ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        )}
        <button type="submit" className="ml-btn ml-btn--primary" disabled={saving}>
          {saving ? "Saving…" : "Save address"}
        </button>
      </div>
    </form>
  );
}
