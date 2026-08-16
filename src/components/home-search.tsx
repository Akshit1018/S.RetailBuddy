import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Package, Plus, Search } from "lucide-react";
import { useT } from "@/lib/i18n-context";
import type { Product } from "@/lib/types";
import { formatINR } from "@/lib/utils";

export function HomeSearch({ products }: { products: Product[] }) {
  const { t } = useT();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 1) return [];
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          p.code.toLowerCase().includes(s) ||
          (p.barcode && p.barcode.toLowerCase().includes(s)),
      )
      .slice(0, 6);
  }, [q, products]);

  const sell = (name: string) => {
    void navigate({ to: "/sell", search: { mode: "product", q: name } });
  };

  return (
    <section aria-label={t("home.searchPh")} className="space-y-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("home.searchPh")}
          className="h-12 w-full rounded-full border border-border bg-surface pl-10 pr-4 text-base text-fg shadow-[var(--shadow-card)] placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
        />
      </div>

      {q.trim() && hits.length === 0 ? (
        <p className="rounded-[var(--radius-lg)] bg-elevated px-3 py-3 text-center text-sm text-muted">
          {t("home.searchEmpty")}{" "}
          <Link to="/stock-in" className="font-semibold text-primary">
            {t("menu.stockIn")}
          </Link>
        </p>
      ) : null}

      {hits.length > 0 ? (
        <ul className="overflow-hidden rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-card)]">
          {hits.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 border-b border-border px-3 py-2.5 last:border-0"
            >
              <Package className="size-4 shrink-0 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-fg">{p.name}</p>
                <p className="text-[11px] text-muted">
                  {p.quantity} {t("common.units")} · {formatINR(p.unitPrice)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => sell(p.name)}
                className="flex h-10 min-w-10 items-center justify-center gap-1 rounded-full bg-primary px-3 text-xs font-semibold text-primary-fg"
              >
                <Plus className="size-3.5" />
                {t("home.sellThis")}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
