import { Link } from "@tanstack/react-router";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStockStore } from "@/lib/store";
import { expiryAlerts } from "@/lib/pharmacy";
import { ymd } from "@/lib/installments";
import { useT } from "@/lib/i18n-context";

export function ExpiryPopup() {
  const { t } = useT();
  const products = useStockStore((s) => s.products);
  const seen = useStockStore((s) => s.expiryPopupOn);
  const dismiss = useStockStore((s) => s.dismissExpiryPopup);
  const settings = useStockStore((s) => s.settings);
  const kind = settings.shopKind;

  if (seen === ymd()) return null;
  const alerts = expiryAlerts(products);
  if (!alerts.all.length && !alerts.expired.length) return null;
  if (kind === "kirana" && !alerts.expired.length && !alerts.band30.length) {
    return null;
  }

  return (
    <div
      data-testid="expiry-popup"
      className="rounded-[var(--radius-lg)] border border-warning/35 bg-warning/10 px-3 py-3"
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning">
          <AlertTriangle className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-fg">{t("exp.title")}</p>
          <p className="mt-0.5 text-[12px] leading-snug text-muted">{t("exp.sub")}</p>
          <ul className="mt-2 space-y-1 text-[13px] text-fg">
            {alerts.expired.slice(0, 2).map((p) => (
              <li key={p.id} className="truncate">
                {p.name}
              </li>
            ))}
            {alerts.band30.slice(0, 2).map((r) => (
              <li key={r.product.id} className="truncate">
                {r.product.name}
              </li>
            ))}
          </ul>
          <Link to="/stock" search={{ bucket: "near_expiry" }} className="mt-2 block">
            <Button variant="secondary" size="sm" className="w-full">
              {t("exp.see")}
            </Button>
          </Link>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted"
          aria-label={t("common.close")}
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
