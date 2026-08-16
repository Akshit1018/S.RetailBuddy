import { formatINR } from "@/lib/utils";
import { useT } from "@/lib/i18n-context";

export function GstBlock({
  taxable,
  cgst,
  sgst,
  total,
}: {
  taxable?: number;
  cgst?: number;
  sgst?: number;
  total: number;
}) {
  const { t } = useT();
  return (
    <div className="space-y-1 text-sm">
      <div className="flex justify-between text-muted">
        <span>{t("gst.taxable")}</span>
        <span className="tabular">{formatINR(taxable ?? total)}</span>
      </div>
      <div className="flex justify-between text-muted">
        <span>{t("gst.cgst")}</span>
        <span className="tabular">{formatINR(cgst ?? 0)}</span>
      </div>
      <div className="flex justify-between text-muted">
        <span>{t("gst.sgst")}</span>
        <span className="tabular">{formatINR(sgst ?? 0)}</span>
      </div>
      <div className="flex justify-between border-t border-border pt-1 font-semibold text-fg">
        <span>{t("common.total")}</span>
        <span className="tabular">{formatINR(total)}</span>
      </div>
    </div>
  );
}
