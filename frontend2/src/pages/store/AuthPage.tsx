import { useState, type ChangeEvent, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/auth-context";
import Logo from "../../components/store/Logo";
import { authApi } from "../../lib/api";
import { errorMessage } from "../../lib/format";
import type { Gender } from "../../lib/types";

type Mode = "signin" | "signup";

interface FormValues {
  name: string;
  email: string;
  password: string;
  gender: Gender | "";
  country: string;
  age: string;
  mobile: string;
}

type Errors = Partial<Record<keyof FormValues, string>>;

const EMPTY: FormValues = { name: "", email: "", password: "", gender: "", country: "", age: "", mobile: "" };

function validate(v: FormValues, mode: Mode): Errors {
  const e: Errors = {};
  if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) e.email = "Enter a valid email address.";
  if (!v.password) e.password = "Enter your password.";
  if (mode === "signup") {
    if (!v.name.trim()) e.name = "Enter your full name.";
    if (v.password && v.password.length < 8) e.password = "Use at least 8 characters.";
    if (!v.gender) e.gender = "Select an option.";
    if (!v.country.trim()) e.country = "Enter your country.";
    if (v.age && (!Number.isInteger(Number(v.age)) || Number(v.age) < 1 || Number(v.age) > 120))
      e.age = "Enter an age between 1 and 120.";
    if (v.mobile && !/^\+?[\d\s-]{7,15}$/.test(v.mobile.trim())) e.mobile = "Enter a valid phone number.";
  }
  return e;
}

const ORDER: (keyof FormValues)[] = ["name", "email", "password", "gender", "country", "age", "mobile"];

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [mode, setMode] = useState<Mode>("signin");
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const isSignup = mode === "signup";

  const bind = (field: keyof FormValues) => ({
    id: `auth-${field}`,
    name: field,
    value: values[field],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setValues((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `auth-${field}-err` : undefined,
  });

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
    setFormError(null);
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validate(values, mode);
    setErrors(found);
    const first = ORDER.find((f) => found[f]);
    if (first) {
      document.getElementById(`auth-${first}`)?.focus();
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      if (isSignup) {
        await signUp({
          name: values.name.trim(),
          email: values.email.trim().toLowerCase(),
          password: values.password,
          gender: values.gender as Gender,
          country: values.country.trim(),
          ...(values.age ? { age: Number(values.age) } : {}),
          ...(values.mobile ? { mobile: values.mobile.trim() } : {}),
          role: "USER",
          authMode: "CREDENTIALS",
        });
      } else {
        await signIn(values.email.trim().toLowerCase(), values.password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(errorMessage(err, isSignup ? "Your account couldn't be created." : "Sign in failed."));
      setSubmitting(false);
    }
  };

  const onGoogle = async () => {
    setGoogleLoading(true);
    setFormError(null);
    try {
      window.location.assign(await authApi.googleAuthUrl());
    } catch (err) {
      setFormError(errorMessage(err, "Google sign-in isn't available right now."));
      setGoogleLoading(false);
    }
  };

  const fieldError = (field: keyof FormValues) =>
    errors[field] ? (
      <p className="ml-field-error" id={`auth-${field}-err`}>
        {errors[field]}
      </p>
    ) : null;

  return (
    <div className="ml-auth">
      <div className="ml-auth-card">
        <Logo />
        <h1>{isSignup ? "Create your account" : "Sign in to your account"}</h1>
        <p className="ml-muted">
          {isSignup ? "Save addresses and check out faster." : "Pick up where you left off with your bag and orders."}
        </p>

        <div className="ml-tabs" role="tablist" aria-label="Sign in or create account">
          <button type="button" role="tab" aria-selected={!isSignup} className={!isSignup ? "is-active" : ""} onClick={() => switchMode("signin")}>
            Sign in
          </button>
          <button type="button" role="tab" aria-selected={isSignup} className={isSignup ? "is-active" : ""} onClick={() => switchMode("signup")}>
            Create account
          </button>
        </div>

        <button type="button" className="ml-btn ml-btn--ghost ml-btn--block" onClick={() => void onGoogle()} disabled={googleLoading || submitting}>
          {googleLoading ? "Opening Google…" : "Continue with Google"}
        </button>

        <div className="ml-divider">
          <span>or use your email</span>
        </div>

        <form onSubmit={onSubmit} noValidate className="ml-auth-form">
          {isSignup && (
            <div className="ml-field">
              <label htmlFor="auth-name">Full name</label>
              <input className="ml-input" type="text" autoComplete="name" {...bind("name")} />
              {fieldError("name")}
            </div>
          )}

          <div className="ml-field">
            <label htmlFor="auth-email">Email</label>
            <input className="ml-input" type="email" autoComplete="email" {...bind("email")} />
            {fieldError("email")}
          </div>

          <div className="ml-field">
            <label htmlFor="auth-password">Password</label>
            <input
              className="ml-input"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              {...bind("password")}
            />
            {fieldError("password") ?? (isSignup && <p className="ml-hint">At least 8 characters.</p>)}
          </div>

          {isSignup && (
            <>
              <div className="ml-field-row">
                <div className="ml-field">
                  <label htmlFor="auth-gender">Gender</label>
                  <select className="ml-input" {...bind("gender")}>
                    <option value="" disabled>
                      Select
                    </option>
                    <option value="FEMALE">Female</option>
                    <option value="MALE">Male</option>
                  </select>
                  {fieldError("gender")}
                </div>
                <div className="ml-field">
                  <label htmlFor="auth-age">
                    Age <span className="ml-optional">(optional)</span>
                  </label>
                  <input className="ml-input" type="number" inputMode="numeric" min={1} max={120} {...bind("age")} />
                  {fieldError("age")}
                </div>
              </div>
              <div className="ml-field-row">
                <div className="ml-field">
                  <label htmlFor="auth-country">Country</label>
                  <input className="ml-input" type="text" autoComplete="country-name" {...bind("country")} />
                  {fieldError("country")}
                </div>
                <div className="ml-field">
                  <label htmlFor="auth-mobile">
                    Mobile <span className="ml-optional">(optional)</span>
                  </label>
                  <input className="ml-input" type="tel" autoComplete="tel" {...bind("mobile")} />
                  {fieldError("mobile")}
                </div>
              </div>
            </>
          )}

          {formError && (
            <div className="ml-alert ml-alert--error" role="alert">
              {formError}
            </div>
          )}

          <button type="submit" className="ml-btn ml-btn--primary ml-btn--block ml-btn--lg" disabled={submitting}>
            {submitting ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
