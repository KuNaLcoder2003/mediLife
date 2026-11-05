export default function FullPageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="ml-fullpage" role="status" aria-live="polite">
      <span className="ml-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
