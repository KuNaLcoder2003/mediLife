import { useState, type ChangeEvent, type FormEvent } from "react";
import { useAuth } from "../../auth/auth-context";
import { userApi } from "../../lib/api";
import { errorMessage } from "../../lib/format";
import type { Gender, User } from "../../lib/types";

interface Values {
    name: string;
    gender: Gender | "";
    age: string;
    mobile: string;
    country: string;
}

type Errors = Partial<Record<keyof Values, string>>;

function toValues(user: User): Values {
    const gender = (user.gender ?? "").toUpperCase();
    return {
        name: user.name ?? "",
        gender: gender === "MALE" || gender === "FEMALE" ? gender : "",
        age: user.age != null ? String(user.age) : "",
        mobile: user.mobile ?? "",
        country: user.country ?? "",
    };
}

function validate(v: Values): Errors {
    const e: Errors = {};
    if (!v.name.trim()) e.name = "Enter your name.";
    if (v.age && (!Number.isInteger(Number(v.age)) || Number(v.age) < 1 || Number(v.age) > 120))
        e.age = "Enter an age between 1 and 120.";
    if (v.mobile && !/^\+?[\d\s-]{7,15}$/.test(v.mobile.trim())) e.mobile = "Enter a valid phone number.";
    return e;
}

const FIELDS: (keyof Values)[] = ["name", "gender", "age", "mobile", "country"];

export default function ProfileForm({ user }: { user: User }) {
    const { reloadUser } = useAuth();
    const [initial, setInitial] = useState<Values>(() => toValues(user));
    const [values, setValues] = useState<Values>(initial);
    const [errors, setErrors] = useState<Errors>({});
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<{ kind: "saved" | "error"; text: string } | null>(null);

    const dirty = FIELDS.some((f) => values[f] !== initial[f]);

    const bind = (field: keyof Values) => ({
        id: `profile-${field}`,
        name: field,
        value: values[field],
        onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            setValues((prev) => ({ ...prev, [field]: e.target.value }));
            setStatus(null);
            if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
        },
        "aria-invalid": errors[field] ? true : undefined,
        "aria-describedby": errors[field] ? `profile-${field}-err` : undefined,
    });

    const error = (field: keyof Values) =>
        errors[field] ? (
            <p className="ml-field-error" id={`profile-${field}-err`}>
                {errors[field]}
            </p>
        ) : null;

    const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const found = validate(values);
        setErrors(found);
        const first = FIELDS.find((f) => found[f]);
        if (first) {
            document.getElementById(`profile-${first}`)?.focus();
            return;
        }

        setSaving(true);
        setStatus(null);
        try {
            await userApi.updateProfile({
                name: values.name.trim(),
                gender: values.gender || null,
                age: values.age ? Number(values.age) : null,
                mobile: values.mobile.trim() || null,
                country: values.country.trim() || null,
            });
            const fresh = await reloadUser();
            const next = fresh ? toValues(fresh) : values;
            setInitial(next);
            setValues(next);
            setStatus({ kind: "saved", text: "Your details are saved." });
        } catch (err) {
            setStatus({ kind: "error", text: errorMessage(err, "Your details couldn't be saved.") });
        } finally {
            setSaving(false);
        }
    };

    return (
        <form className="ml-panel ml-profile-form" onSubmit={onSubmit} noValidate>
            <div className="ml-panel-head">
                <h2>Personal details</h2>
            </div>

            <div className="ml-field">
                <label htmlFor="profile-name">Full name</label>
                <input className="ml-input" type="text" autoComplete="name" {...bind("name")} />
                {error("name")}
            </div>

            <div className="ml-field">
                <span className="ml-field-label">Email</span>
                <p className="ml-readonly">{user.email}</p>
                <p className="ml-hint">Your email is used to sign in and can't be changed here.</p>
            </div>

            <div className="ml-field-row">
                <div className="ml-field">
                    <label htmlFor="profile-mobile">
                        Mobile <span className="ml-optional">(optional)</span>
                    </label>
                    <input className="ml-input" type="tel" autoComplete="tel" {...bind("mobile")} />
                    {error("mobile")}
                </div>
                <div className="ml-field">
                    <label htmlFor="profile-country">
                        Country <span className="ml-optional">(optional)</span>
                    </label>
                    <input className="ml-input" type="text" autoComplete="country-name" {...bind("country")} />
                    {error("country")}
                </div>
            </div>

            <div className="ml-field-row">
                <div className="ml-field">
                    <label htmlFor="profile-gender">
                        Gender <span className="ml-optional">(optional)</span>
                    </label>
                    <select className="ml-input" {...bind("gender")}>
                        <option value="">Prefer not to say</option>
                        <option value="FEMALE">Female</option>
                        <option value="MALE">Male</option>
                    </select>
                </div>
                <div className="ml-field">
                    <label htmlFor="profile-age">
                        Age <span className="ml-optional">(optional)</span>
                    </label>
                    <input className="ml-input" type="number" inputMode="numeric" min={1} max={120} {...bind("age")} />
                    {error("age")}
                </div>
            </div>

            <div className="ml-form-actions ml-form-actions--split">
                <p className={status?.kind === "error" ? "ml-field-error" : "ml-saved"} role="status" aria-live="polite">
                    {status?.text}
                </p>
                <div className="ml-form-actions">
                    {dirty && (
                        <button
                            type="button"
                            className="ml-btn ml-btn--ghost"
                            onClick={() => {
                                setValues(initial);
                                setErrors({});
                            }}
                            disabled={saving}
                        >
                            Discard changes
                        </button>
                    )}
                    <button type="submit" className="ml-btn ml-btn--primary" disabled={!dirty || saving}>
                        {saving ? "Saving…" : "Save changes"}
                    </button>
                </div>
            </div>
        </form>
    );
}