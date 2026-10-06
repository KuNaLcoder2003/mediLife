import { useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/auth-context";
import AddressBook from "../components/store/AddressBook";
import OrdersList from "../components/store/OrderList";
import ProfileForm from "../components/store/ProfileForm";
import FullPageLoader from "../components/store/FullPageLoader";
import Icon, { type IconName } from "../components/store/Icon";
import { formatDate } from "../lib/format";

type Tab = "profile" | "orders" | "addresses";

const TABS: { id: Tab; label: string; icon: IconName }[] = [
    { id: "profile", label: "Profile", icon: "user" },
    { id: "orders", label: "Orders", icon: "package" },
    { id: "addresses", label: "Addresses", icon: "pin" },
];

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")).toUpperCase() || "?";
}

export default function AccountPage() {
    const { user } = useAuth();
    const [params, setParams] = useSearchParams();
    const requested = params.get("tab");
    const tab: Tab = TABS.some((t) => t.id === requested) ? (requested as Tab) : "profile";

    if (!user) return <FullPageLoader label="Loading your account…" />;

    return (
        <div className="ml-container ml-account-page">
            <header className="ml-account-head">
                <span className="ml-avatar" aria-hidden="true">
                    {initials(user.name)}
                </span>
                <div>
                    <h1>{user.name}</h1>
                    <p className="ml-muted">{user.email}</p>
                    {user.createdAt && <p className="ml-muted ml-small">Member since {formatDate(user.createdAt)}</p>}
                </div>
            </header>

            <div className="ml-account-body">
                <nav className="ml-account-tabs" aria-label="Account sections">
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            className={t.id === tab ? "is-active" : undefined}
                            aria-current={t.id === tab ? "page" : undefined}
                            onClick={() => setParams(t.id === "profile" ? {} : { tab: t.id })}
                        >
                            <Icon name={t.icon} size={18} />
                            {t.label}
                        </button>
                    ))}
                </nav>

                <div className="ml-account-content">
                    {tab === "profile" && <ProfileForm key={user.id} user={user} />}
                    {tab === "orders" && (
                        <section aria-labelledby="orders-title">
                            <h2 id="orders-title" className="ml-account-section-title">
                                Your orders
                            </h2>
                            <OrdersList />
                        </section>
                    )}
                    {tab === "addresses" && <AddressBook addresses={user.addresses} />}
                </div>
            </div>
        </div>
    );
}