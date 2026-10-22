import { useState } from "react";
import PrimaryButton from "../store/auth/PrimaryButton";
import { AlertIcon, CheckIcon, GripIcon, TrashIcon, UploadIcon } from "../store/auth/Icons";
import { adminProductApi } from "../../lib/api";

const MAX_IMAGES = 8;       // total images per product
const BATCH_SIZE = 5;       // the server accepts at most 5 files per request
const MAX_MB = 5;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

type Status = "pending" | "uploading" | "done" | "failed";
interface Item { id: string; file: File; url: string; status: Status }
interface Issue { title: string; reason: string }

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

interface Props {
  productId: string;
  name: string;
  summary: string;
  onDone: () => void;
}

export default function ProductImagesStep({ productId, name, summary, onDone }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [dragOver, setDragOver] = useState(false);   // files dragged over the drop zone
  const [dragIdx, setDragIdx] = useState<number | null>(null); // tile being reordered
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const added: Item[] = [];
    const problems: Issue[] = [];
    let room = MAX_IMAGES - items.length;

    for (const file of Array.from(list)) {
      const wasn = `${file.name} wasn't added`;
      const duplicate = [...items, ...added].some((i) => i.file.name === file.name && i.file.size === file.size);
      if (!TYPES.includes(file.type)) {
        problems.push({ title: wasn, reason: "Only JPG, PNG or WEBP images are allowed." });
      } else if (file.size > MAX_MB * 1024 * 1024) {
        problems.push({ title: wasn, reason: `The file is ${(file.size / 1024 / 1024).toFixed(1)} MB. Compress it to under ${MAX_MB} MB and try again.` });
      } else if (duplicate) {
        problems.push({ title: wasn, reason: "This image is already in the list." });
      } else if (room <= 0) {
        problems.push({ title: wasn, reason: `You can add up to ${MAX_IMAGES} images.` });
      } else {
        room--;
        added.push({ id: uid(), file, url: URL.createObjectURL(file), status: "pending" });
      }
    }
    if (added.length) setItems((arr) => [...arr, ...added]);
    setIssues(problems);
  };

  const remove = (id: string) => {
    setItems((arr) => {
      const gone = arr.find((i) => i.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
      return arr.filter((i) => i.id !== id);
    });
  };

  const makeCover = (index: number) =>
    setItems((arr) => {
      const next = [...arr];
      const [picked] = next.splice(index, 1);
      return [picked, ...next];
    });

  const dropOnTile = (to: number) => {
    if (dragIdx === null || dragIdx === to) return;
    setItems((arr) => {
      const next = [...arr];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDragIdx(null);
  };

  const setStatus = (ids: string[], status: Status) =>
    setItems((arr) => arr.map((i) => (ids.includes(i.id) ? { ...i, status } : i)));

  const publish = async () => {
    const todo = items.filter((i) => i.status !== "done");
    if (todo.length === 0) { onDone(); return; } // product is already saved, nothing more to upload

    setBusy(true);
    setIssues([]);
    for (let start = 0; start < todo.length; start += BATCH_SIZE) {
      const batch = todo.slice(start, start + BATCH_SIZE);
      const ids = batch.map((b) => b.id);
      setStatus(ids, "uploading");
      setProgress(0);
      try {
        await adminProductApi.uploadImages(productId, batch.map((b) => b.file), setProgress);
        setStatus(ids, "done");
      } catch (e) {
        setStatus(ids, "failed");
        setIssues([{ title: "Images weren't uploaded", reason: e instanceof Error ? e.message : "Something went wrong. Try again." }]);
        setBusy(false);
        return;
      }
    }
    setBusy(false);
    onDone();
  };

  return (
    <>
      <section className="card saved">
        <div>
          <small className="saved__tag"><CheckIcon /> Details saved</small>
          <strong>{name}</strong>
          <p>{summary}</p>
        </div>
        <button type="button" className="link-btn" disabled title="Editing saved details needs an update endpoint on the backend">
          Edit details
        </button>
      </section>

      <div className="images-grid">
        <section className="card">
          <div className="card__head">
            <div>
              <h2>Product images</h2>
              <p className="muted">The cover image is shown in listings and search. Drag to reorder.</p>
            </div>
            <span className="count-pill">{items.length} of {MAX_IMAGES} images</span>
          </div>

          <div
            className={dragOver ? "drop drop--over" : "drop"}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
          >
            <span className="drop__icon"><UploadIcon /></span>
            <p><strong>Drag images here or <label htmlFor="img-input" className="browse">browse files</label></strong></p>
            <small>JPG, PNG or WEBP · up to {MAX_MB} MB each · at least 800 × 800 px, square works best</small>
            <input
              id="img-input"
              type="file"
              multiple
              hidden
              accept={TYPES.join(",")}
              onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
            />
          </div>

          {items.length > 0 && (
            <ul className="tiles">
              {items.map((it, i) => (
                <li
                  key={it.id}
                  className={`tile tile--${it.status}${i === 0 ? " tile--cover" : ""}`}
                  draggable={!busy && it.status !== "done"}
                  onDragStart={() => setDragIdx(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dropOnTile(i)}
                  onDragEnd={() => setDragIdx(null)}
                >
                  <div className="tile__img">
                    <img src={it.url} alt={it.file.name} />
                    {i === 0 && <span className="cover-badge">COVER</span>}
                    <span className="grip"><GripIcon /></span>
                  </div>
                  <div className="tile__foot">
                    {it.status === "uploading" ? (
                      <>
                        <div className="tile__row"><span>{progress >= 100 ? "Finishing…" : "Uploading…"}</span><b>{progress}%</b></div>
                        <div className="bar"><span style={{ width: `${progress}%` }} /></div>
                      </>
                    ) : (
                      <div className="tile__row">
                        {i === 0
                          ? <b>Cover image</b>
                          : <button type="button" className="tile__btn" disabled={busy} onClick={() => makeCover(i)}>Set as cover</button>}
                        {it.status === "done"
                          ? <span className="tile__ok">Uploaded</span>
                          : <button type="button" className="tile__btn tile__btn--icon" aria-label={`Remove ${it.file.name}`} disabled={busy} onClick={() => remove(it.id)}><TrashIcon /></button>}
                      </div>
                    )}
                    {it.status === "failed" && <small className="tile__bad">Not uploaded · will retry</small>}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {issues.length > 0 && (
            <div className="issue" role="alert">
              <AlertIcon />
              <div>
                {issues.map((x, i) => (
                  <p key={i}><b>{x.title}</b><br />{x.reason}</p>
                ))}
              </div>
              <button type="button" className="link-btn" onClick={() => setIssues([])}>Dismiss</button>
            </div>
          )}
        </section>

        <aside className="card tips">
          <h3 className="eyebrow">Photos that build trust</h3>
          <ul>
            <li><CheckIcon /><span><b>Front of pack first:</b> brand name and product name clearly readable.</span></li>
            <li><CheckIcon /><span><b>Show the label:</b> specifications, certification marks and manufacturer details.</span></li>
            <li><CheckIcon /><span><b>What's in the box:</b> lay out every item included.</span></li>
            <li><CheckIcon /><span><b>Plain light background,</b> no watermarks or promotional text.</span></li>
          </ul>
        </aside>
      </div>

      <section className="card actions">
        <button type="button" className="btn-ghost" disabled title="Going back needs an update endpoint on the backend, otherwise saving again would create a duplicate product">
          ← Back to details
        </button>
        <PrimaryButton type="button" loading={busy} onClick={publish}>Publish product</PrimaryButton>
      </section>
    </>
  );
}