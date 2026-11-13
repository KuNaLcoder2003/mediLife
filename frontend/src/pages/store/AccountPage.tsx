import { useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/auth-context";
import { ClipboardIcon, LogoutIcon, PinIcon, UserIcon } from "../../components/store/auth/Icons";
import AddressBook from "../../components/store/AddressBook";
import FullPageLoader from "../../components/store/FullPageLoader";
import OrdersList from "../../components/store/OrderList";
import ProfileForm from "../../components/store/ProfileForm";
import { authApi } from "../../lib/api";
import { errorMessage } from "../../lib/format";

type Tab = "profile" | "orders" | "addresses";

const TABS: { id: Tab; label: string; title: string; icon: ReactNode }[] = [
    { id: "profile", label: "Profile & settings", title: "Profile & settings", icon: <UserIcon /> },
    { id: "orders", label: "My orders", title: "My orders", icon: <ClipboardIcon /> },
    { id: "addresses", label: "Saved addresses", title: "Saved addresses", icon: <PinIcon /> },
];

const monthYear = new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" });

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")).toUpperCase() || "?";
}

/** Password: the reset-link endpoint (forgot password) is the only real API for this. */
function SecurityCard({ email }: { email: string }) {
    const [state, setState] = useState<{ kind: "idle" | "sending" | "sent" | "error"; text?: string }>({ kind: "idle" });

    const sendLink = async () => {
        setState({ kind: "sending" });
        try {
            await authApi.forgotPassword(email);
            setState({ kind: "sent", text: `We've emailed a password reset link to ${email}.` });
        } catch (err) {
            setState({ kind: "error", text: errorMessage(err, "We couldn't send the reset link. Try again.") });
        }
    };

    return (
        <section className="ac-card ac-panel" aria-labelledby="security-title">
            <h2 id="security-title">Password &amp; security</h2>
            <div className="ac-line">
                <div>
                    <strong>Password</strong>
                    <small className={state.kind === "error" ? "is-error" : undefined} role="status" aria-live="polite">
                        {state.text ?? "Change it using a reset link sent to your email."}
                    </small>
                </div>
                <button type="button" className="hm-btn hm-btn--outline" onClick={() => void sendLink()} disabled={state.kind === "sending"}>
                    {state.kind === "sending" ? "Sending…" : "Change password"}
                </button>
            </div>
            <div className="ac-line">
                <div>
                    <strong>Signed-in devices <span className="ac-soon">Coming soon</span></strong>
                    <small>This device</small>
                </div>
                <button type="button" className="hm-btn hm-btn--outline" disabled>Sign out other devices</button>
            </div>
        </section>
    );
}


const NOTIFICATIONS = [
    { label: "Order & delivery updates on WhatsApp", hint: "Recommended", on: true },
    { label: "Refill reminders for repeat purchases", hint: "", on: true },
    { label: "Offers and new products by email", hint: "", on: false },
];

function NotificationsCard() {
    return (
        <section className="ac-card ac-panel" aria-labelledby="notify-title">
            <h2 id="notify-title">Notifications <span className="ac-soon">Coming soon</span></h2>
            <ul className="ac-toggles">
                {NOTIFICATIONS.map((n) => (
                    <li key={n.label}>
                        <label>
                            <span>
                                {n.label}
                                {n.hint && <small>{n.hint}</small>}
                            </span>
                            <input type="checkbox" defaultChecked={n.on} disabled />
                        </label>
                    </li>
                ))}
            </ul>
        </section>
    );
}


function DeleteCard() {
    return (
        <section className="ac-card ac-panel ac-danger" aria-labelledby="delete-title">
            <div>
                <strong id="delete-title">Delete account <span className="ac-soon">Coming soon</span></strong>
                <small>Permanently removes your profile, addresses and saved prescriptions.</small>
            </div>
            <button type="button" className="hm-btn hm-btn--outline ac-btn-danger" disabled>Delete account</button>
        </section>
    );
}

export default function AccountPage() {
    const { user, signOut } = useAuth();
    const [params, setParams] = useSearchParams();
    const requested = params.get("tab");
    const tab: Tab = TABS.some((t) => t.id === requested) ? (requested as Tab) : "profile";

    if (!user) return <FullPageLoader label="Loading your account…" />;

    const joined = user.createdAt ? new Date(user.createdAt) : null;

    return (
        <div className="ac-page">
            <div className="hm-wide ac-layout">
                <aside className="ac-side" aria-label="Account">
                    <div className="ac-card ac-user">
                        <span className="ac-avatar" aria-hidden="true">{initials(user.name)}</span>
                        <div>
                            <strong>{user.name}</strong>
                            {joined && !Number.isNaN(joined.getTime()) && <small>Member since {monthYear.format(joined)}</small>}
                        </div>
                    </div>

                    <nav className="ac-card ac-nav" aria-label="Account sections">
                        {TABS.map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                className={t.id === tab ? "is-active" : undefined}
                                aria-current={t.id === tab ? "page" : undefined}
                                onClick={() => setParams(t.id === "profile" ? {} : { tab: t.id })}
                            >
                                {t.icon}
                                {t.label}
                            </button>
                        ))}
                        <hr />
                        <button type="button" className="is-danger" onClick={() => void signOut()}>
                            <LogoutIcon />
                            Sign out
                        </button>
                    </nav>
                </aside>

                <div className="ac-main">
                    <h1>{TABS.find((t) => t.id === tab)?.title}</h1>

                    {tab === "profile" && (
                        <div className="ac-stack">
                            <ProfileForm key={user.id} user={user} />
                            <SecurityCard email={user.email} />
                            <NotificationsCard />
                            <DeleteCard />
                        </div>
                    )}
                    {tab === "orders" && <OrdersList />}
                    {tab === "addresses" && <AddressBook addresses={user.addresses} />}
                </div>
            </div>
        </div>
    );
}