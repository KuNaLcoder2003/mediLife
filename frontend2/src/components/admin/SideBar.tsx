import type { TabId } from "./types";
import Icon, { type IconName } from "./Icon";

export interface NavTab {
    id: TabId;
    label: string;
    icon: IconName;
    ready: boolean;
}

interface SidebarProps {
    tabs: NavTab[];
    active: TabId;
    onSelect: (id: TabId) => void;
}

export default function Sidebar({ tabs, active, onSelect }: SidebarProps) {
    return (
        <aside className="ap-sidebar">
            <div className="ap-brand">
                <span className="ap-brand-mark" aria-hidden="true">S</span>
                <span className="ap-brand-text">
                    <strong>Storefront</strong>
                    <span>Admin</span>
                </span>
            </div>

            <nav aria-label="Admin sections">
                <ul className="ap-nav">
                    {tabs.map((tab) => {
                        const isActive = tab.id === active;
                        return (
                            <li key={tab.id}>
                                <button
                                    type="button"
                                    className={`ap-nav-item${isActive ? " is-active" : ""}`}
                                    aria-current={isActive ? "page" : undefined}
                                    disabled={!tab.ready}
                                    title={tab.ready ? undefined : `${tab.label} isn't available yet`}
                                    onClick={() => onSelect(tab.id)}
                                >
                                    <Icon name={tab.icon} />
                                    <span className="ap-nav-label">{tab.label}</span>
                                    {!tab.ready && <span className="ap-soon">Soon</span>}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </aside>
    );
}