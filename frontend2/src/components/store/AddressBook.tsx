import { useState } from "react";
import { useAuth } from "../../auth/auth-context";
import type { Address } from "../../lib/types";
import AddressForm from "./AddressForm";
import Icon from "./Icon";

export default function AddressBook({ addresses }: { addresses: Address[] }) {
    const { reloadUser } = useAuth();
    const [adding, setAdding] = useState(false);

    return (
        <section className="ml-panel" aria-labelledby="addresses-title">
            <div className="ml-panel-head">
                <h2 id="addresses-title">Saved addresses</h2>
                {!adding && (
                    <button type="button" className="ml-btn ml-btn--ghost ml-btn--sm" onClick={() => setAdding(true)}>
                        <Icon name="plus" size={15} /> Add address
                    </button>
                )}
            </div>

            {addresses.length === 0 && !adding && (
                <p className="ml-muted">No saved addresses yet. Add one to check out faster.</p>
            )}

            {addresses.length > 0 && (
                <ul className="ml-address-grid">
                    {addresses.map((a) => (
                        <li key={a.id} className="ml-address-card">
                            <Icon name="pin" size={18} />
                            <span className="ml-address-body">
                                <strong>{a.addressLine1}</strong>
                                {a.addressLine2 && <span>{a.addressLine2}</span>}
                                <span>{a.postalCode}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            )}

            {adding && (
                <AddressForm
                    onSaved={async () => {
                        await reloadUser();
                        setAdding(false);
                    }}
                    onCancel={() => setAdding(false)}
                />
            )}
        </section>
    );
}