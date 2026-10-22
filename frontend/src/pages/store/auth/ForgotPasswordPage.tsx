import { useState } from "react";
import { Link } from "react-router-dom";
import FormInput from "../../../components/store/auth/FormInput";
import PrimaryButton from "../../../components/store/auth/PrimaryButton";
import { BackIcon, MailIcon } from "../../../components/store/auth/Icons";
import { authApi } from "../../../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");
    setError("");
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset">
      <Link to="/login" className="back" aria-label="Back"><BackIcon /></Link>

      {sent ? (
        <div className="sent">
          <span className="sent__icon"><MailIcon /></span>
          <h1>Check your email</h1>
          <p className="muted">
            If an account exists for {email}, we've sent a link to reset your password.
          </p>
          <button type="button" className="btn-outline" onClick={() => setSent(false)}>
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <h1>Forgot your password?</h1>
          <p className="muted">Enter your email and we'll send you a link to set a new password for your account</p>

          <FormInput id="email" label="Email address" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} error={error} />

          <PrimaryButton type="submit" loading={loading}>Send reset link</PrimaryButton>
        </form>
      )}

      <p className="reset__foot">Remembered it? <Link to="/login">Back to sign in</Link></p>
    </div>
  );
}