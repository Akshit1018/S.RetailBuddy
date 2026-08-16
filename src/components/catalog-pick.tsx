import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Product } from "@/lib/types";
import { formatINR } from "@/lib/utils";

export function CatalogPick({
  products,
  onAdd,
  placeholder = "Search your stock to add…",
  emptyHint = "No matching products.",
  inStockOnly = false,
}: {
  products: Product[];
  onAdd: (product: Product) => void;
  placeholder?: string;
  emptyHint?: string;
  inStockOnly?: boolean;
}) {
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);

  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products
      .filter((p) => (inStockOnly ? p.quantity > 0 : true))
      .filter((p) => {
        if (!needle) return focused;
        return (
          p.name.toLowerCase().includes(needle) ||
          p.code.toLowerCase().includes(needle) ||
          (p.barcode ? p.barcode.includes(needle) : false)
        );
      })
      .slice(0, 8);
  }, [products, q, focused, inStockOnly]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          className="pl-9"
          aria-label={placeholder}
        />
      </div>
      {hits.length > 0 ? (
        <ul className="space-y-1.5">
          {hits.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  onAdd(p);
                  setQ("");
                }}
                className="flex min-h-12 w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-border bg-elevated px-3 py-2 text-left active:scale-[0.99]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-fg">
                    {p.name}
                  </span>
                  <span className="block font-mono text-[11px] text-subtle">
                    {p.code} · {p.quantity} in stock
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-primary">
                  {formatINR(p.unitPrice)}
                  <Plus className="size-4" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : q.trim() ? (
        <p className="text-xs text-muted">{emptyHint}</p>
      ) : null}
    </div>
  );
}
