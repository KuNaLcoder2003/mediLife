import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PrimaryButton from "../../components/PrimaryButton";
import { adminProductApi, type Category } from "../../lib/api";

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export default function AddProductPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({ name: "", description: "", categoryId: "", price: "", discount: "", quantity: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminProductApi.categories().then(setCategories).catch(() => setFormError("Couldn't load categories."));
  }, []);

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm({ ...form, [key]: e.target.value });

  const price = Number(form.price) || 0;
  const discount = Math.min(Number(form.discount) || 0, 100);
  const pays = price * (1 - discount / 100);
  const qty = Number(form.quantity) || 0;
  const categoryName = categories.find((c) => c.id === form.categoryId)?.category;

  const err = (k: string) => errors[k] && <p className="field-error">{errors[k]}</p>;

  const addCategory = async () => {
    const name = window.prompt("New category name")?.trim();
    if (!name) return;
    try {
      await adminProductApi.createCategory(name);
      setCategories(await adminProductApi.categories());
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Couldn't add the category.");
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found: Record<string, string> = {};
    if (!form.name.trim()) found.name = "Enter the product name.";
    if (!form.description.trim()) found.description = "Enter a description.";
    if (!form.categoryId) found.categoryId = "Choose a category.";
    if (!(price > 0)) found.price = "Enter a price above 0.";
    if (form.discount && (Number(form.discount) < 0 || Number(form.discount) > 100)) found.discount = "Use 0 to 100.";
    if (form.quantity === "" || !Number.isInteger(Number(form.quantity)) || Number(form.quantity) < 0)
      found.quantity = "Enter a whole number, 0 or more.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    setFormError("");
    try {
      const product = await adminProductApi.create({
        productName: form.name.trim(),
        productDescription: form.description.trim(),
        price,
        discount: Number(form.discount) || 0,
        quantity: Number(form.quantity),
        categoryId: form.categoryId,
      });
      setCreated({ id: product.id, name: form.name.trim() });
      setStep(2);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Couldn't create the product.");
    } finally {
      setSaving(false);
    }
  };

  if (step === 2 && created) {
    return (
      <>
        <h1>Details saved</h1>
        <p className="muted">"{created.name}" was created (id {created.id}). The image upload step comes next.</p>
        <Link to="/admin/products">Back to products</Link>
      </>
    );
  }

  return (
    <>
      <p className="crumbs"><Link to="/admin/products">Products</Link> / <b>Add product</b></p>
      <header className="page-head">
        <div>
          <h1>Add a new product</h1>
          <p className="muted">Start with the details. You'll add product images in the next step.</p>
        </div>
        <ol className="steps"><li className="on">1 Details</li><li>2 Images</li></ol>
      </header>

      <form className="product-grid" onSubmit={onSubmit} noValidate>
        <div className="stack">
          <section className="card">
            <h2 className="card-title">Basic information</h2>

            <div className="field">
              <label htmlFor="p-name">Product name <span className="req">*</span><small className="count">{form.name.length}/120</small></label>
              <input id="p-name" className="input" maxLength={120} value={form.name} onChange={set("name")} />
              {err("name")}
            </div>

            <div className="field">
              <label htmlFor="p-desc">Description <span className="req">*</span></label>
              <textarea id="p-desc" className="input input--area" value={form.description} onChange={set("description")} />
              <p className="field-hint">Include usage, size or pack count, and any safety warnings.</p>
              {err("description")}
            </div>

            <div className="field">
              <label htmlFor="p-cat">Category <span className="req">*</span>
                <button type="button" className="link-btn" onClick={addCategory}>+ New category</button>
              </label>
              <select id="p-cat" className="input" value={form.categoryId} onChange={set("categoryId")}>
                <option value="">Select a category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.category}</option>)}
              </select>
              {err("categoryId")}
            </div>
          </section>

          <section className="card">
            <h2 className="card-title">Pricing</h2>
            <div className="row">
              <div className="field">
                <label htmlFor="p-price">Price (MRP) <span className="req">*</span></label>
                <div className="phone"><span>$</span><input id="p-price" type="number" min="0" step="0.01" value={form.price} onChange={set("price")} /></div>
                {err("price")}
              </div>
              <div className="field">
                <label htmlFor="p-disc">Discount <span className="optional">(optional)</span></label>
                <div className="phone phone--end"><input id="p-disc" type="number" min="0" max="100" value={form.discount} onChange={set("discount")} /><span>%</span></div>
                {err("discount")}
              </div>
            </div>
            <div className="pays">
              <span>Customer pays</span>
              <span><strong>{money(pays)}</strong>{discount > 0 && <small>saves {money(price - pays)}</small>}</span>
            </div>
          </section>

          <section className="card">
            <h2 className="card-title">Inventory</h2>
            <div className="row3">
              <div className="field">
                <label htmlFor="p-qty">Quantity in stock <span className="req">*</span></label>
                <input id="p-qty" className="input" type="number" min="0" value={form.quantity} onChange={set("quantity")} />
                {err("quantity")}
              </div>
              <div className="field">
                <label>Reserved</label>
                <div className="readonly">—</div>
              </div>
              <div className="field">
                <label>Available to sell</label>
                <div className="readonly readonly--ok">{qty} units</div>
              </div>
            </div>
            <p className="field-hint">Reserved stock is managed automatically: it goes up when an order is placed and is released when the order ships or is cancelled.</p>
          </section>

          <section className="card actions">
            <Link to="/admin/products" className="btn-ghost">Cancel</Link>
            <div>
              {formError && <p className="field-error">{formError}</p>}
              <PrimaryButton type="submit" loading={saving}>Save & add images →</PrimaryButton>
            </div>
          </section>
        </div>

        <aside className="stack">
          <section className="card">
            <h3 className="eyebrow">Storefront preview</h3>
            <div className="preview__img">Images added in step 2</div>
            {categoryName && <small className="preview__cat">{categoryName}</small>}
            <strong className="preview__name">{form.name || "Product name"}</strong>
            <p className="preview__price">
              <b>{money(pays)}</b>
              {discount > 0 && <><s>{money(price)}</s><span className="pill tone-amber">{discount}% off</span></>}
            </p>
            <small className={qty > 0 ? "stock-ok" : "stock-bad"}>{qty > 0 ? "In stock" : "Out of stock"}</small>
          </section>

          <section className="card">
            <h3 className="eyebrow">Set automatically</h3>
            <dl className="auto">
              <div><dt>Product ID</dt><dd>Generated on save</dd></div>
              <div><dt>Created</dt><dd>On save</dd></div>
              <div><dt>Last updated</dt><dd>On every edit</dd></div>
            </dl>
          </section>
        </aside>
      </form>
    </>
  );
}