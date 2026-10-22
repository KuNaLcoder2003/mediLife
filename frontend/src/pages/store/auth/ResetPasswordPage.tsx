import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PasswordInput from "../../../components/store/auth/PasswordInput";
import PrimaryButton from "../../../components/store/auth/PrimaryButton";
import { BackIcon, CheckIcon, CircleIcon } from "../../../components/store/auth/Icons";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const email = params.get("email") ?? "your account";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const rules = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "One number", ok: /\d/.test(password) },
    { label: "One symbol (e.g. # @ !)", ok: /[^\w\s]/.test(password) },
  ];

  const allRulesPass = rules.every((r) => r.ok);
  const mismatch = confirm !== "" && confirm !== password;
  const canSubmit = allRulesPass && confirm !== "" && !mismatch;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    // will call the reset password API here
    setLoading(false);
  };

  return (
    <div className="reset">
      <Link to="/login" className="back" aria-label="Back"><BackIcon /></Link>

      <form onSubmit={onSubmit} noValidate>
        <h1>Set a new password</h1>
        <p className="muted">For {email}. You'll be signed out on other devices.</p>

        <PasswordInput id="new-password" label="New password" value={password}
          onChange={(e) => setPassword(e.target.value)} />

        <ul className="rules">
          {rules.map((r) => (
            <li key={r.label} className={r.ok ? "ok" : ""}>
              {r.ok ? <CheckIcon /> : <CircleIcon />} {r.label}
            </li>
          ))}
        </ul>

        <PasswordInput id="confirm-password" label="Confirm password" value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={mismatch ? "Passwords don't match. Check and try again." : undefined} />

        <PrimaryButton type="submit" loading={loading} disabled={!canSubmit}>
          Update password
        </PrimaryButton>
      </form>

      <p className="reset__foot">Remembered it? <Link to="/login">Back to sign in</Link></p>
    </div>
  );
}