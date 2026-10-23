// import { useEffect, useState } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import FormInput from "../../components/store/auth/FormInput";
// import PrimaryButton from "../../components/store/auth/PrimaryButton";
// import { CheckIcon } from "../../components/store/auth/Icons";
// import ProductImagesStep from "../../components/Admin/ProductImagesStep";

// import { adminProductApi, type Category } from "../../lib/api";

// const money = (n: number) =>
//   new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

// export default function AddProductPage() {
//   const [step, setStep] = useState<1 | 2>(1);
//   const navigate = useNavigate();
//   const [created, setCreated] = useState<{ id: string; name: string; summary: string } | null>(null);

//   const [categories, setCategories] = useState<Category[]>([]);
//   const [form, setForm] = useState({ name: "", description: "", categoryId: "", price: "", discount: "", quantity: "" });
//   const [errors, setErrors] = useState<Record<string, string>>({});
//   const [formError, setFormError] = useState("");
//   const [saving, setSaving] = useState(false);

//   // "New category" dialog
//   const [catOpen, setCatOpen] = useState(false);
//   const [catName, setCatName] = useState("");
//   const [catError, setCatError] = useState("");
//   const [catSaving, setCatSaving] = useState(false);

//   useEffect(() => {
//     adminProductApi.categories().then(setCategories).catch(() => setFormError("Couldn't load categories."));
//   }, []);

//   // Close the dialog with the Escape key
//   useEffect(() => {
//     if (!catOpen) return;
//     const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setCatOpen(false); };
//     window.addEventListener("keydown", onKey);
//     return () => window.removeEventListener("keydown", onKey);
//   }, [catOpen]);

//   const set = (key: keyof typeof form) =>
//     (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
//       setForm({ ...form, [key]: e.target.value });

//   const price = Number(form.price) || 0;
//   const discount = Math.min(Number(form.discount) || 0, 100);
//   const pays = price * (1 - discount / 100);
//   const qty = Number(form.quantity) || 0;
//   const categoryName = categories.find((c) => c.id === form.categoryId)?.category;

//   const err = (k: string) => errors[k] && <p className="field-error">{errors[k]}</p>;

//   const openCategoryDialog = () => {
//     setCatName("");
//     setCatError("");
//     setCatOpen(true);
//   };

//   const saveCategory = async (e: React.FormEvent) => {
//     e.preventDefault();
//     const name = catName.trim();
//     if (!name) return setCatError("Enter a category name.");
//     setCatSaving(true);
//     setCatError("");
//     try {
//       await adminProductApi.createCategory(name);
//       const list = await adminProductApi.categories();
//       setCategories(list);
//       const added = list.find((c) => c.category.toLowerCase() === name.toLowerCase());
//       if (added) setForm((f) => ({ ...f, categoryId: added.id })); // select it automatically
//       setCatOpen(false);
//     } catch (e2) {
//       setCatError(e2 instanceof Error ? e2.message : "Couldn't add the category.");
//     } finally {
//       setCatSaving(false);
//     }
//   };

//   const onSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     const found: Record<string, string> = {};
//     if (!form.name.trim()) found.name = "Enter the product name.";
//     if (!form.description.trim()) found.description = "Enter a description.";
//     if (!form.categoryId) found.categoryId = "Choose a category.";
//     if (!(price > 0)) found.price = "Enter a price above 0.";
//     if (form.discount && (Number(form.discount) < 0 || Number(form.discount) > 100)) found.discount = "Use 0 to 100.";
//     if (form.quantity === "" || !Number.isInteger(Number(form.quantity)) || Number(form.quantity) < 0)
//       found.quantity = "Enter a whole number, 0 or more.";
//     setErrors(found);
//     if (Object.keys(found).length) return;

//     setSaving(true);
//     setFormError("");
//     try {
//       const product = await adminProductApi.create({
//         productName: form.name.trim(),
//         productDescription: form.description.trim(),
//         price,
//         discount: Number(form.discount) || 0,
//         quantity: Number(form.quantity),
//         reservedQuantity: 0, // required by the database; a new product has nothing reserved
//         categoryId: form.categoryId,
//       });
//       setCreated({
//         id: product.id,
//         name: form.name.trim(),
//         summary: `${categoryName ?? "—"} · ${money(pays)}${discount > 0 ? ` after ${discount}% off` : ""} · ${qty} in stock`,
//       });
//       setStep(2);
//     } catch (e2) {
//       setFormError(e2 instanceof Error ? e2.message : "Couldn't create the product.");
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <>
//       {/* Top bar for this page: breadcrumb on the left, stepper on the right */}
//       <div className="subbar">
//         <p className="crumbs"><Link to="/admin/products">Products</Link> / <b>Add product</b></p>
//         <ol className="stepper">
//           <li className={step === 1 ? "on" : "done"}>
//             <span>{step === 1 ? 1 : <CheckIcon />}</span>Details
//           </li>
//           <li className={step === 2 ? "line line--on" : "line"} aria-hidden="true" />
//           <li className={step === 2 ? "on" : ""}><span>2</span>Images</li>
//         </ol>
//       </div>

//       <div className="page-pad">
//         {step === 2 && created ? (
//           <ProductImagesStep
//             productId={created.id}
//             name={created.name}
//             summary={created.summary}
//             onDone={() => navigate("/admin/products")}
//           />
//         ) : (
//           <>
//             <header className="page-head">
//               <div>
//                 <h1>Add a new product</h1>
//                 <p className="muted">Start with the details. You'll add product images in the next step.</p>
//               </div>
//             </header>

//             <form className="product-grid" onSubmit={onSubmit} noValidate>
//               <div className="stack">
//                 <section className="card">
//                   <h2 className="card-title">Basic information</h2>

//                   <div className="field">
//                     <label htmlFor="p-name">Product name <span className="req">*</span><small className="count">{form.name.length}/120</small></label>
//                     <input id="p-name" className="input" maxLength={120} value={form.name} onChange={set("name")} />
//                     {err("name")}
//                   </div>

//                   <div className="field">
//                     <label htmlFor="p-desc">Description <span className="req">*</span></label>
//                     <textarea id="p-desc" className="input input--area" value={form.description} onChange={set("description")} />
//                     <p className="field-hint">Include usage, size or pack count, and any safety warnings.</p>
//                     {err("description")}
//                   </div>

//                   <div className="field">
//                     <label htmlFor="p-cat">Category <span className="req">*</span>
//                       <button type="button" className="link-btn" onClick={openCategoryDialog}>+ New category</button>
//                     </label>
//                     <select id="p-cat" className="input" value={form.categoryId} onChange={set("categoryId")}>
//                       <option value="">Select a category</option>
//                       {categories.map((c) => <option key={c.id} value={c.id}>{c.category}</option>)}
//                     </select>
//                     {err("categoryId")}
//                   </div>
//                 </section>

//                 <section className="card">
//                   <h2 className="card-title">Pricing</h2>
//                   <div className="row">
//                     <div className="field">
//                       <label htmlFor="p-price">Price (MRP) <span className="req">*</span></label>
//                       <div className="phone"><span>$</span><input id="p-price" type="number" min="0" step="0.01" value={form.price} onChange={set("price")} /></div>
//                       {err("price")}
//                     </div>
//                     <div className="field">
//                       <label htmlFor="p-disc">Discount <span className="optional">(optional)</span></label>
//                       <div className="phone phone--end"><input id="p-disc" type="number" min="0" max="100" value={form.discount} onChange={set("discount")} /><span>%</span></div>
//                       {err("discount")}
//                     </div>
//                   </div>
//                   <div className="pays">
//                     <span>Customer pays</span>
//                     <span><strong>{money(pays)}</strong>{discount > 0 && <small>saves {money(price - pays)}</small>}</span>
//                   </div>
//                 </section>

//                 <section className="card">
//                   <h2 className="card-title">Inventory</h2>
//                   <div className="row3">
//                     <div className="field">
//                       <label htmlFor="p-qty">Quantity in stock <span className="req">*</span></label>
//                       <input id="p-qty" className="input" type="number" min="0" value={form.quantity} onChange={set("quantity")} />
//                       {err("quantity")}
//                     </div>
//                     <div className="field">
//                       <label>Reserved</label>
//                       <div className="readonly">0</div>
//                     </div>
//                     <div className="field">
//                       <label>Available to sell</label>
//                       <div className="readonly readonly--ok">{qty} units</div>
//                     </div>
//                   </div>
//                   <p className="field-hint">Reserved stock is managed automatically: it goes up when an order is placed and is released when the order ships or is cancelled.</p>
//                 </section>

//                 <section className="card actions">
//                   <Link to="/admin/products" className="btn-ghost">Cancel</Link>
//                   <div>
//                     {formError && <p className="field-error">{formError}</p>}
//                     <PrimaryButton type="submit" loading={saving}>Save & add images →</PrimaryButton>
//                   </div>
//                 </section>
//               </div>

//               <aside className="stack">
//                 <section className="card">
//                   <h3 className="eyebrow">Storefront preview</h3>
//                   <div className="preview__img">Images added in step 2</div>
//                   {categoryName && <small className="preview__cat">{categoryName}</small>}
//                   <strong className="preview__name">{form.name || "Product name"}</strong>
//                   <p className="preview__price">
//                     <b>{money(pays)}</b>
//                     {discount > 0 && <><s>{money(price)}</s><span className="pill tone-amber">{discount}% off</span></>}
//                   </p>
//                   <small className={qty > 0 ? "stock-ok" : "stock-bad"}>{qty > 0 ? "In stock" : "Out of stock"}</small>
//                 </section>

//                 <section className="card">
//                   <h3 className="eyebrow">Set automatically</h3>
//                   <dl className="auto">
//                     <div><dt>Product ID</dt><dd>Generated on save</dd></div>
//                     <div><dt>Created</dt><dd>On save</dd></div>
//                     <div><dt>Last updated</dt><dd>On every edit</dd></div>
//                   </dl>
//                 </section>
//               </aside>
//             </form>
//           </>
//         )}
//       </div>

//       {/* New category dialog (outside the main form, because forms can't be nested) */}
//       {catOpen && (
//         <div className="modal" role="dialog" aria-modal="true" onClick={() => setCatOpen(false)}>
//           <form className="modal__box" onClick={(e) => e.stopPropagation()} onSubmit={saveCategory} noValidate>
//             <h2>New category</h2>
//             <p className="muted">Add a category you can choose for products.</p>
//             <FormInput
//               id="new-cat"
//               label="Category name"
//               value={catName}
//               onChange={(e) => setCatName(e.target.value)}
//               error={catError}
//               autoFocus
//             />
//             <div className="modal__actions">
//               <button type="button" className="btn-ghost" onClick={() => setCatOpen(false)}>Cancel</button>
//               <PrimaryButton type="submit" loading={catSaving}>Add category</PrimaryButton>
//             </div>
//           </form>
//         </div>
//       )}
//     </>
//   );
// }

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import FormInput from "../../components/store/auth/FormInput";
import PrimaryButton from "../../components/store/auth/PrimaryButton";
import { CheckIcon } from "../../components/store/auth/Icons";
import ProductImagesStep from "../../components/Admin/ProductImagesStep";

import { adminProductApi, productApi, type Category, type Product } from "../../lib/api";

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

// This page is used twice:
//   /admin/products/new               -> add a product (step 1 details, step 2 images)
//   /admin/products/:productId/edit   -> edit a product (details only, then back to the list)
export default function AddProductPage() {
  const { productId } = useParams();
  const isEdit = !!productId;

  const [step, setStep] = useState<1 | 2>(1);
  const navigate = useNavigate();
  const [created, setCreated] = useState<{ id: string; name: string; summary: string } | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({ name: "", description: "", categoryId: "", price: "", discount: "", quantity: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit mode: the product being edited, and whether it is still loading
  const [original, setOriginal] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(isEdit);
  const filled = useRef(false); // the form is filled from the product only once

  // "New category" dialog
  const [catOpen, setCatOpen] = useState(false);
  const [catName, setCatName] = useState("");
  const [catError, setCatError] = useState("");
  const [catSaving, setCatSaving] = useState(false);

  useEffect(() => {
    adminProductApi.categories().then(setCategories).catch(() => setFormError("Couldn't load categories."));
  }, []);

  // Edit mode: load the product
  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    productApi.list()
      .then((list) => {
        if (cancelled) return;
        const found = list.find((p) => p.id === productId);
        if (found) setOriginal(found);
        else setFormError("Product not found.");
      })
      .catch((e) => {
        if (!cancelled) setFormError(e instanceof Error ? e.message : "Couldn’t load the product.");
      })
      .finally(() => {
        if (!cancelled) setLoadingProduct(false);
      });
    return () => { cancelled = true; };
  }, [productId]);

  // Edit mode: once the product and the categories are both loaded, fill the form
  useEffect(() => {
    if (!original || filled.current || categories.length === 0) return;
    const catId =
      original.categoryId ??
      categories.find((c) => c.category === original.category?.category)?.id ??
      "";
    setForm({
      name: original.productName,
      description: original.productDescription ?? "",
      categoryId: catId,
      price: String(original.price),
      discount: original.discount ? String(original.discount) : "",
      quantity: String(original.quantity),
    });
    filled.current = true;
  }, [original, categories]);

  // Close the dialog with the Escape key
  useEffect(() => {
    if (!catOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setCatOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [catOpen]);

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm({ ...form, [key]: e.target.value });

  const price = Number(form.price) || 0;
  const discount = Math.min(Number(form.discount) || 0, 100);
  const pays = price * (1 - discount / 100);
  const qty = Number(form.quantity) || 0;
  const reserved = isEdit ? (original?.reservedQuantity ?? 0) : 0;
  const available = Math.max(qty - reserved, 0);
  const categoryName = categories.find((c) => c.id === form.categoryId)?.category;

  const err = (k: string) => errors[k] && <p className="field-error">{errors[k]}</p>;

  const openCategoryDialog = () => {
    setCatName("");
    setCatError("");
    setCatOpen(true);
  };

  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = catName.trim();
    if (!name) return setCatError("Enter a category name.");
    setCatSaving(true);
    setCatError("");
    try {
      await adminProductApi.createCategory(name);
      const list = await adminProductApi.categories();
      setCategories(list);
      const added = list.find((c) => c.category.toLowerCase() === name.toLowerCase());
      if (added) setForm((f) => ({ ...f, categoryId: added.id })); // select it automatically
      setCatOpen(false);
    } catch (e2) {
      setCatError(e2 instanceof Error ? e2.message : "Couldn't add the category.");
    } finally {
      setCatSaving(false);
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
    else if (isEdit && Number(form.quantity) < reserved)
      found.quantity = `Can’t be less than the ${reserved} units already reserved.`;
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    setFormError("");
    try {
      // Edit mode: save the changes and go back to the list
      if (isEdit && productId) {
        await adminProductApi.update(productId, {
          productName: form.name.trim(),
          productDescription: form.description.trim(),
          price,
          discount: Number(form.discount) || 0,
          quantity: Number(form.quantity),
          categoryId: form.categoryId,
          // reservedQuantity is not sent: orders manage it automatically
        });
        navigate("/admin/products");
        return;
      }

      const product = await adminProductApi.create({
        productName: form.name.trim(),
        productDescription: form.description.trim(),
        price,
        discount: Number(form.discount) || 0,
        quantity: Number(form.quantity),
        reservedQuantity: 0, // required by the database; a new product has nothing reserved
        categoryId: form.categoryId,
      });
      setCreated({
        id: product.id,
        name: form.name.trim(),
        summary: `${categoryName ?? "—"} · ${money(pays)}${discount > 0 ? ` after ${discount}% off` : ""} · ${qty} in stock`,
      });
      setStep(2);
    } catch (e2) {
      setFormError(
        e2 instanceof Error ? e2.message : isEdit ? "Couldn’t save the changes." : "Couldn't create the product.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Top bar for this page: breadcrumb on the left, stepper on the right (add mode only) */}
      <div className="subbar">
        <p className="crumbs">
          <Link to="/admin/products">Products</Link> / <b>{isEdit ? "Edit product" : "Add product"}</b>
        </p>
        {!isEdit && (
          <ol className="stepper">
            <li className={step === 1 ? "on" : "done"}>
              <span>{step === 1 ? 1 : <CheckIcon />}</span>Details
            </li>
            <li className={step === 2 ? "line line--on" : "line"} aria-hidden="true" />
            <li className={step === 2 ? "on" : ""}><span>2</span>Images</li>
          </ol>
        )}
      </div>

      <div className="page-pad">
        {step === 2 && created ? (
          <ProductImagesStep
            productId={created.id}
            name={created.name}
            summary={created.summary}
            onDone={() => navigate("/admin/products")}
          />
        ) : isEdit && loadingProduct ? (
          <p className="empty">Loading…</p>
        ) : (
          <>
            <header className="page-head">
              <div>
                <h1>{isEdit ? "Edit product" : "Add a new product"}</h1>
                <p className="muted">
                  {isEdit
                    ? "Change the details below and save. Product images stay as they are."
                    : "Start with the details. You'll add product images in the next step."}
                </p>
              </div>
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
                      <button type="button" className="link-btn" onClick={openCategoryDialog}>+ New category</button>
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
                      <div className="readonly">{reserved}</div>
                    </div>
                    <div className="field">
                      <label>Available to sell</label>
                      <div className="readonly readonly--ok">{available} units</div>
                    </div>
                  </div>
                  <p className="field-hint">Reserved stock is managed automatically: it goes up when an order is placed and is released when the order ships or is cancelled.</p>
                </section>

                <section className="card actions">
                  <Link to="/admin/products" className="btn-ghost">Cancel</Link>
                  <div>
                    {formError && <p className="field-error">{formError}</p>}
                    <PrimaryButton type="submit" loading={saving}>
                      {isEdit ? "Save changes" : "Save & add images →"}
                    </PrimaryButton>
                  </div>
                </section>
              </div>

              <aside className="stack">
                <section className="card">
                  <h3 className="eyebrow">Storefront preview</h3>
                  <div className="preview__img">{isEdit ? "Images stay as they are" : "Images added in step 2"}</div>
                  {categoryName && <small className="preview__cat">{categoryName}</small>}
                  <strong className="preview__name">{form.name || "Product name"}</strong>
                  <p className="preview__price">
                    <b>{money(pays)}</b>
                    {discount > 0 && <><s>{money(price)}</s><span className="pill tone-amber">{discount}% off</span></>}
                  </p>
                  <small className={available > 0 ? "stock-ok" : "stock-bad"}>{available > 0 ? "In stock" : "Out of stock"}</small>
                </section>

                <section className="card">
                  <h3 className="eyebrow">Set automatically</h3>
                  <dl className="auto">
                    <div><dt>Product ID</dt><dd>{isEdit && productId ? `#${productId.slice(0, 8)}` : "Generated on save"}</dd></div>
                    <div><dt>Created</dt><dd>{isEdit ? "Already created" : "On save"}</dd></div>
                    <div><dt>Last updated</dt><dd>On every edit</dd></div>
                  </dl>
                </section>
              </aside>
            </form>
          </>
        )}
      </div>

      {/* New category dialog (outside the main form, because forms can't be nested) */}
      {catOpen && (
        <div className="modal" role="dialog" aria-modal="true" onClick={() => setCatOpen(false)}>
          <form className="modal__box" onClick={(e) => e.stopPropagation()} onSubmit={saveCategory} noValidate>
            <h2>New category</h2>
            <p className="muted">Add a category you can choose for products.</p>
            <FormInput
              id="new-cat"
              label="Category name"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              error={catError}
              autoFocus
            />
            <div className="modal__actions">
              <button type="button" className="btn-ghost" onClick={() => setCatOpen(false)}>Cancel</button>
              <PrimaryButton type="submit" loading={catSaving}>Add category</PrimaryButton>
            </div>
          </form>
        </div>
      )}
    </>
  );
}