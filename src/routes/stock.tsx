import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/app-shell";
import { PageGuide } from "@/components/page-guide";
import { ProductList } from "@/components/product-list";
import { StockBucketTabs } from "@/components/stock-bucket-tabs";
import { HelpTip } from "@/components/help-tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bucketCounts, filterByBucket } from "@/lib/stock-buckets";
import { useActiveProfile, useStockStore } from "@/lib/store";
import { effectiveStaffPerms } from "@/lib/staff";
import type { StockBucket } from "@/lib/types";
import { useT } from "@/lib/i18n-context";
import { openWhatsApp } from "@/lib/whatsapp";
import { toast } from "sonner";

const searchSchema = z.object({
  bucket: z
    .enum(["current", "reorder", "near_expiry", "expired"])
    .catch("current"),
});

export const Route = createFileRoute("/stock")({
  validateSearch: searchSchema,
  component: StockPage,
});

function StockPage() {
  const { t } = useT();
  const products = useStockStore((s) => s.products);
  const settings = useStockStore((s) => s.settings);
  const profile = useActiveProfile();
  const canView = effectiveStaffPerms(profile).viewStock;
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [q, setQ] = useState("");
  const bucket = search.bucket as StockBucket;

  const counts = bucketCounts(products, settings);
  const filtered = useMemo(() => {
    let list = filterByBucket(products, bucket, settings);
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.code.toLowerCase().includes(term) ||
          (p.barcode && p.barcode.includes(term)),
      );
    }
    return list;
  }, [products, bucket, q, settings]);

  const label =
    bucket === "current"
      ? t("bucket.current")
      : bucket === "reorder"
        ? t("bucket.reorder")
        : bucket === "near_expiry"
          ? t("bucket.near")
          : t("bucket.expired");

  return (
    <AppShell title={t("stock.title")}>
      {!canView ? (
        <p className="rounded-[var(--radius-lg)] bg-surface px-4 py-10 text-center text-sm text-muted">
          {t("staff.noView")}
        </p>
      ) : (
      <div className="space-y-3.5 fade-in">
        <PageGuide text={t("guide.stock")} />
        <div className="flex items-center gap-2">
          <p className="flex-1 text-xs text-muted">{t("home.sectionsHint")}</p>
          <HelpTip tipKey="tip.stockSections" />
        </div>

        <StockBucketTabs
          value={bucket}
          onChange={(b) => void navigate({ search: { bucket: b } })}
          counts={counts}
        />

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("stock.search")}
            className="pl-9"
          />
        </div>

        <p className="text-sm font-medium text-fg">
          {label}{" "}
          <span className="font-normal text-muted">({filtered.length})</span>
        </p>

        <ProductList products={filtered} emptyText={t("bucket.empty")} />

        {bucket === "reorder" && filtered.length > 0 ? (
          <Button
            className="w-full"
            variant="secondary"
            onClick={() => {
              const lines = filtered
                .map((p) => `• ${p.name} — ${p.quantity} left (need ${p.reorderLevel})`)
                .join("\n");
              openWhatsApp(
                `https://wa.me/?text=${encodeURIComponent(`Low stock / reorder:\n${lines}`)}`,
              );
              toast.success("WhatsApp opened");
            }}
          >
            WhatsApp reorder list
          </Button>
        ) : null}
      </div>
      )}
    </AppShell>
  );
}
