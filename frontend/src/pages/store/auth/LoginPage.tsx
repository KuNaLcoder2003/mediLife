import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../auth/auth-context";
import BrandLogo from "../../../components/store/auth/BrandLogo";
import FormInput from "../../../components/store/auth/FormInput";
import PasswordInput from "../../../components/store/auth/PasswordInput";
import PrimaryButton from "../../../components/store/auth/PrimaryButton";
import { ShieldIcon, DocIcon, LockIcon, RefreshIcon, GoogleIcon } from "../../../components/store/auth/Icons";
import { startGoogleSignIn } from "../../../auth/google";
import { errorMessage } from "../../../lib/format";

const features = [
  { icon: <ShieldIcon />, title: "Genuine products only", text: "Sourced from verified manufacturers and authorised distributors." },
  { icon: <DocIcon />, title: "Pharmacist-checked prescriptions", text: "Rx items are reviewed by a licensed pharmacist before dispatch." },
  { icon: <LockIcon />, title: "Your health data stays private", text: "Encrypted at rest and never sold or shared for advertising." },
];

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    params.get("error") === "google_failed" ? "Google sign-in didn't finish. Try again or use your email." : "",
  );
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");
    if (!password) return setError("Enter your password.");
    setError("");
    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Sign in failed."));
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      startGoogleSignIn(from);
    } catch (err) {
      setError(errorMessage(err, "Google sign-in isn't available right now."));
      setGoogleLoading(false);
    }
  };

  return (
    <div className="login">
      <aside className="login__brand">
        <BrandLogo />
        <h1>Medical supplies, delivered with care.</h1>
        <p>Sign in to reorder your regular supplies, track deliveries and keep your prescriptions in one safe place.</p>

        <ul className="features">
          {features.map((f) => (
            <li key={f.title}>
              <span className="icon-box">{f.icon}</span>
              <div><strong>{f.title}</strong><small>{f.text}</small></div>
            </li>
          ))}
        </ul>

        <div className="reorder">
          <span className="icon-box"><RefreshIcon /></span>
          <div>
            <small>AFTER YOU SIGN IN</small>
            <strong>Reorder your usual supplies in one tap</strong>
          </div>
        </div>

        <small className="legal">Licensed pharmacy · Drug Licence No. [XXXX-XXXX] · [City, State]</small>
      </aside>

      <main className="login__form">
        <p className="login__top">New to MedLife? <Link to="/signup" state={location.state}>Create an account</Link></p>

        <form onSubmit={onSubmit} noValidate>
          <h2>Welcome back</h2>
          <p className="muted">Sign in with your email and password.</p>

          <FormInput id="email" label="Email address" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} />

          <div className="password-row">
            <PasswordInput id="password" label="Password" value={password}
              onChange={(e) => setPassword(e.target.value)} />
            <Link className="forgot" to="/forgot-password">Forgot password?</Link>
          </div>

          <label className="check">
            <input type="checkbox" defaultChecked /> Keep me signed in on this device
          </label>

          {error && <p className="field-error">{error}</p>}

          <PrimaryButton type="submit" loading={loading}>Sign in</PrimaryButton>

          <div className="divider"><span>or</span></div>

          <button type="button" className="btn-outline" onClick={onGoogle} disabled={googleLoading}>
            <GoogleIcon /> {googleLoading ? "Redirecting…" : "Continue with Google"}
          </button>

          <p className="guest">
            <span>Just need a quick order?</span>
            <Link to="/products">Continue as guest →</Link>
          </p>
        </form>

        <footer className="login__foot">
          <span>Need help? Call [1800-XXX-XXXX] · 8am–10pm</span>
          <span><a href="#">Terms</a><a href="#">Privacy</a></span>
        </footer>
      </main>
    </div>
  );
}