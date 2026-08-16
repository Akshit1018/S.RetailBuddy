import type { StockBucket } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-context";

export function StockBucketTabs({
  value,
  onChange,
  counts,
}: {
  value: StockBucket;
  onChange: (b: StockBucket) => void;
  counts: Record<StockBucket, number>;
}) {
  const { t } = useT();
  const order: StockBucket[] = ["current", "reorder", "near_expiry", "expired"];
  const meta: Record<
    StockBucket,
    { short: string; tone: "white" | "green" | "yellow" | "red" }
  > = {
    current: { short: t("bucket.currentShort"), tone: "white" },
    reorder: { short: t("bucket.reorderShort"), tone: "green" },
    near_expiry: { short: t("bucket.nearShort"), tone: "yellow" },
    expired: { short: t("bucket.expiredShort"), tone: "red" },
  };

  return (
    <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
      {order.map((key) => {
        const m = meta[key];
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={cn(
              "flex min-h-[4.1rem] flex-col items-center justify-center gap-1 rounded-[var(--radius-xl)] px-0.5 py-2 text-center transition-all active:scale-[0.98]",
              active
                ? toneActive(m.tone)
                : "bg-elevated text-muted ring-1 ring-border/70",
            )}
            aria-pressed={active}
          >
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold tabular",
                active ? "bg-black/10 dark:bg-white/15" : toneDot(m.tone),
              )}
            >
              {counts[key]}
            </span>
            <span className="max-w-full px-0.5 text-[9px] font-semibold leading-tight sm:text-[10px]">
              {m.short}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function toneActive(tone: string) {
  switch (tone) {
    case "white":
      return "bg-bucket-white text-bucket-white-fg ring-1 ring-border shadow-sm";
    case "green":
      return "bg-bucket-green text-bucket-green-fg shadow-sm";
    case "yellow":
      return "bg-bucket-yellow text-bucket-yellow-fg shadow-sm";
    case "red":
      return "bg-bucket-red text-bucket-red-fg shadow-sm";
    default:
      return "bg-elevated";
  }
}

function toneDot(tone: string) {
  switch (tone) {
    case "white":
      return "bg-surface text-fg ring-1 ring-border";
    case "green":
      return "bg-success/15 text-success";
    case "yellow":
      return "bg-warning/15 text-warning";
    case "red":
      return "bg-danger/15 text-danger";
    default:
      return "bg-surface";
  }
}
