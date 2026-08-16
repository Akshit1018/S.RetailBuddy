export function BillProof({
  src,
  label = "Bill photo",
}: {
  src?: string | null;
  label?: string;
}) {
  if (!src) {
    return (
      <p className="rounded-[var(--radius-lg)] border border-dashed border-border px-3 py-4 text-center text-xs text-muted">
        No bill photo attached
      </p>
    );
  }
  return (
    <figure className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-elevated">
      <img
        src={src}
        alt={label}
        className="max-h-52 w-full object-contain"
        crossOrigin="anonymous"
      />
      <figcaption className="px-3 py-1.5 text-center text-[11px] text-muted">
        {label}
      </figcaption>
    </figure>
  );
}
