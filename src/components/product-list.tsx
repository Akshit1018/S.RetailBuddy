import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  daysUntilExpiry,
  isExpired,
  isNearExpiry,
  isLowStock,
} from "@/lib/stock-buckets";
import type { Product } from "@/lib/types";
import { formatDate, formatINR } from "@/lib/utils";
import { useT } from "@/lib/i18n-context";

export function ProductList({
  products,
  emptyText,
  compact = false,
}: {
  products: Product[];
  emptyText?: string;
  compact?: boolean;
}) {
  const { t } = useT();
  const empty = emptyText ?? t("bucket.empty");

  if (products.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-dashed border-border-strong px-4 py-6 text-center text-sm text-muted">
        {empty}
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {products.map((p) => {
        const days = daysUntilExpiry(p.expiryDate);
        return (
          <li key={p.id}>
            <Card>
              <CardContent
                className={compact ? "space-y-1.5 py-2.5" : "space-y-2 py-3"}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-fg">
                      {p.name}
                    </p>
                    <p className="font-mono text-[11px] text-subtle">
                      {p.code}
                      {!compact && p.barcode ? ` · ${p.barcode}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold tabular text-fg sm:text-xl">
                      {p.quantity}
                    </p>
                    <p className="text-[10px] text-muted">{t("common.units")}</p>
                  </div>
                </div>
                {!compact ? (
                <div className="flex flex-wrap gap-1">
                  {p.pendingQuantity > 0 ? (
                    <Badge variant="warning">
                      {p.pendingQuantity} {t("stock.pending")}
                    </Badge>
                  ) : null}
                  {isExpired(p) ? (
                    <Badge variant="danger">{t("bucket.expiredShort")}</Badge>
                  ) : isNearExpiry(p) ? (
                    <Badge variant="warning">
                      {t("bucket.nearShort")} {days}d
                    </Badge>
                  ) : null}
                  {isLowStock(p) || p.quantity === 0 ? (
                    <Badge variant="success">{t("bucket.reorderShort")}</Badge>
                  ) : null}
                  {!compact &&
                  p.expiryDate &&
                  !isExpired(p) &&
                  !isNearExpiry(p) ? (
                    <Badge variant="muted">
                      Exp {formatDate(p.expiryDate)}
                    </Badge>
                  ) : null}
                </div>
                ) : null}
                {!compact ? (
                  <div className="grid grid-cols-3 gap-2 border-t border-border pt-2 text-xs">
                    <div>
                      <p className="text-subtle">Cost</p>
                      <p className="font-medium tabular text-fg">
                        {formatINR(p.unitCost)}
                      </p>
                    </div>
                    <div>
                      <p className="text-subtle">Sell</p>
                      <p className="font-medium tabular text-fg">
                        {formatINR(p.unitPrice)}
                      </p>
                    </div>
                    <div>
                      <p className="text-subtle">Margin</p>
                      <p className="font-medium tabular text-success">
                        {formatINR(p.unitPrice - p.unitCost)}
                      </p>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
