import { effectivePaymentStatus, paymentTone } from "@/lib/payment";
import type { SaleRecord } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-context";

export function PaymentBadge({ sale }: { sale: SaleRecord }) {
  const { t } = useT();
  const status = effectivePaymentStatus(sale);
  const tone = paymentTone(status);
  const label =
    status === "paid"
      ? t("pay.paid")
      : status === "pending"
        ? t("pay.pending")
        : status === "ledger"
          ? t("pay.ledger")
          : t("pay.overdue");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        tone === "green" && "bg-bucket-green/15 text-bucket-green",
        tone === "yellow" && "bg-bucket-yellow/15 text-bucket-yellow",
        tone === "red" && "bg-bucket-red/15 text-bucket-red",
        tone === "ledger" && "bg-info/15 text-info",
      )}
    >
      <span
        className={cn(
          "mr-1.5 size-1.5 rounded-full",
          tone === "green" && "bg-bucket-green",
          tone === "yellow" && "bg-bucket-yellow",
          tone === "red" && "bg-bucket-red",
          tone === "ledger" && "bg-info",
        )}
      />
      {label}
    </span>
  );
}
