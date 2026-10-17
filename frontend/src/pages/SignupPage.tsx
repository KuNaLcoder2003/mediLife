import { useState } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import FormInput from "../components/FormInput";
import PasswordInput from "../components/PasswordInput";
import PrimaryButton from "../components/PrimaryButton";
import { GoogleIcon, InfoIcon } from "../components/Icons";

const COUNTRIES: Record<string, string> = {
  India: "+91", "United States": "+1", "United Kingdom": "+44", UAE: "+971",
};
const LEVELS = ["Weak", "Weak", "Fair", "Strong", "Very strong"];

const score = (p: string) =>
  [p.length >= 8, /\d/.test(p), /[^\w\s]/.test(p), /[a-z]/.test(p) && /[A-Z]/.test(p)].filter(Boolean).length;

export default function SignupPage() {
  const [form, setForm] = useState({
    name: "", email: "", password: "", country: "India", mobile: "", age: "", gender: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [key]: e.target.value });

  const strength = score(form.password);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found: Record<string, string> = {};
    if (!form.name.trim()) found.name = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) found.email = "Enter a valid email address.";
    if (form.password.length < 8) found.password = "Use at least 8 characters.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setLoading(true);
    // will call the signup API here
    setLoading(false);
  };

  return (
    <div className="signup">
      <header className="signup__bar">
        <BrandLogo />
        <p>Already have an account? <Link to="/login">Sign in</Link></p>
      </header>

      <form className="signup__card" onSubmit={onSubmit} noValidate>
        <h1>Create your account</h1>
        <p className="muted">Takes under a minute. Fields marked optional can be added later from your profile.</p>

        <FormInput id="name" label="Full name" value={form.name}
          onChange={set("name")} error={errors.name} />

        <FormInput id="email" label="Email address" type="email" value={form.email}
          onChange={set("email")} error={errors.email}
          hint="You'll use this to sign in. One account per email." />

        <PasswordInput id="password" label="Password" value={form.password}
          onChange={set("password")} error={errors.password} />

        <div className="strength">
          <div className="strength__bars">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={i < strength ? "on" : ""} />
            ))}
          </div>
          {form.password && (
            <p><strong>{LEVELS[strength]}</strong> · 8+ characters with a number and a symbol</p>
          )}
        </div>

        <div className="row">
          <div className="field">
            <label htmlFor="country">Country <span className="optional">(optional)</span></label>
            <select id="country" className="input" value={form.country} onChange={set("country")}>
              {Object.keys(COUNTRIES).map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="mobile">Mobile <span className="optional">(optional)</span></label>
            <div className="phone">
              <span>{COUNTRIES[form.country]}</span>
              <input id="mobile" type="tel" placeholder="98765 43210"
                value={form.mobile} onChange={set("mobile")} />
            </div>
          </div>
        </div>
        <p className="field-hint hint-gap">Mobile is only used for delivery updates. Code follows the selected country.</p>

        <fieldset className="about">
          <legend>About you <span className="optional">(optional)</span></legend>
          <p>Helps us suggest suitable products, like age-appropriate dosages and sizes. Never shown to anyone else.</p>
          <div className="row">
            <FormInput id="age" label="Age" type="number" placeholder="e.g. 34"
              value={form.age} onChange={set("age")} />
            <div className="field">
              <label htmlFor="gender">Gender</label>
              <select id="gender" className="input" value={form.gender} onChange={set("gender")}>
                <option value="">Select</option>
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
              </select>
            </div>
          </div>
        </fieldset>

        <label className="check terms">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>
            I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>,
            including how my health information is handled.
          </span>
        </label>

        <PrimaryButton type="submit" loading={loading} disabled={!agreed}>Create account</PrimaryButton>

        <div className="divider"><span>or</span></div>
        <button type="button" className="btn-outline"><GoogleIcon /> Sign up with Google</button>

        <div className="notice">
          <InfoIcon />
          <p>Prescription-only items need a valid prescription at checkout. You can upload it once and reuse it.</p>
        </div>
      </form>
    </div>
  );
}