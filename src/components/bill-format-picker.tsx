import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { BILL_FORMATS, formatMeta } from "@/lib/bill-formats";
import type { BillFormat, GstScheme } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BillFormatPicker({
  value,
  onChange,
  scheme,
  irn,
  ewbNo,
  onMeta,
}: {
  value: BillFormat[];
  onChange: (next: BillFormat[]) => void;
  scheme: GstScheme;
  irn?: string | null;
  ewbNo?: string | null;
  onMeta?: (patch: { irn?: string; ewbNo?: string }) => void;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const selected = value.length ? value : (["retail"] as BillFormat[]);

  const toggle = (id: BillFormat) => {
    if (selected.includes(id)) {
      const next = selected.filter((x) => x !== id);
      onChange(next.length ? next : ["retail"]);
      return;
    }
    onChange([...selected, id]);
  };

  return (
    <div className="space-y-2" data-testid="bill-format-picker">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center justify-between rounded-[var(--radius-md)] border border-border bg-elevated px-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-[11px] text-muted">{t("fmt.pick")}</span>
          <span className="block truncate text-[13px] font-semibold text-fg">
            {selected.map((id) => formatMeta(id).label).join(", ")}
          </span>
        </span>
        <ChevronDown className={cn("size-4 text-muted", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="space-y-1 rounded-[var(--radius-md)] border border-border bg-surface p-2">
          <p className="px-1 pb-1 text-[11px] leading-snug text-muted">{t("fmt.hint")}</p>
          {BILL_FORMATS.map((f) => {
            const blocked = scheme === "composition" && !f.compositionOk;
            const on = selected.includes(f.id);
            return (
              <label
                key={f.id}
                className={cn(
                  "flex min-h-12 items-start gap-2 rounded-[var(--radius-sm)] px-2 py-1.5",
                  blocked && "opacity-45",
                  on && "bg-primary/8",
                )}
              >
                <input
                  type="checkbox"
                  className="mt-1 size-4"
                  checked={on}
                  disabled={blocked}
                  onChange={() => toggle(f.id)}
                />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-fg">
                    {f.label}
                  </span>
                  <span className="block text-[11px] leading-snug text-muted">
                    {f.hint}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      ) : null}

      {selected.includes("e_invoice") ? (
        <div className="grid gap-1">
          <Label className="text-xs">{t("fmt.irn")}</Label>
          <Input
            value={irn || ""}
            onChange={(e) => onMeta?.({ irn: e.target.value })}
            placeholder="IRN from GST portal"
          />
        </div>
      ) : null}
      {selected.includes("e_way") ? (
        <div className="grid gap-1">
          <Label className="text-xs">{t("fmt.ewb")}</Label>
          <Input
            value={ewbNo || ""}
            onChange={(e) => onMeta?.({ ewbNo: e.target.value })}
            placeholder="EWB-xxxxxxxx"
          />
        </div>
      ) : null}
    </div>
  );
}
