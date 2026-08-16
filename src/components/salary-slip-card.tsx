import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStockStore } from "@/lib/store";
import type { PayChannel, PfType, Profile } from "@/lib/types";
import { calcSlip, currentMonth, monthLabel, slipWhatsApp } from "@/lib/salary";
import { formatINR } from "@/lib/utils";
import { openWhatsApp } from "@/lib/whatsapp";
import { useT } from "@/lib/i18n-context";
import { cn } from "@/lib/utils";

export function SalarySlipCard({ staff }: { staff: Profile }) {
  const { t } = useT();
  const allSlips = useStockStore((s) => s.salarySlips);
  const slips = allSlips.filter((x) => x.staffId === staff.id);
  const create = useStockStore((s) => s.createSalarySlip);
  const markPaid = useStockStore((s) => s.markSlipPaid);
  const updateProfile = useStockStore((s) => s.updateProfile);
  const shop = useStockStore((s) => s.shop);
  const month = currentMonth();
  const [channel, setChannel] = useState<PayChannel>(staff.payMode || "cash");
  const [pfType, setPfType] = useState<PfType>(staff.pfType || "non_pf");
  const [basic, setBasic] = useState(String(staff.salary || ""));
  const preview = calcSlip({
    staff: { ...staff, salary: Number(basic) || staff.salary },
    month,
    pfType,
    channel,
  });

  const make = () => {
    updateProfile(staff.id, {
      payMode: channel,
      pfType,
      salary: Number(basic) || staff.salary,
    });
    const res = create({
      staffId: staff.id,
      month,
      basic: Number(basic) || undefined,
      pfType,
      channel,
    });
    if (!res.ok) toast.error(res.error);
    else toast.success(t("sal.made"));
  };

  const send = (id: string) => {
    const slip = slips.find((s) => s.id === id);
    if (!slip) return;
    const phone = (staff.phone || "").replace(/\D/g, "");
    const text = slipWhatsApp(shop.name, slip);
    if (phone.length >= 10) {
      const p = phone.length === 10 ? `91${phone}` : phone;
      openWhatsApp(`https://wa.me/${p}?text=${encodeURIComponent(text)}`);
      toast.success(t("sal.sent"));
    } else {
      void navigator.clipboard?.writeText(text);
      toast.success(t("sal.copied"));
    }
  };

  return (
    <Card className="border-0" data-testid="salary-slip">
      <CardContent className="space-y-3 py-4">
        <p className="text-[14px] font-semibold text-fg">{t("sal.title")}</p>
        <p className="text-[12px] leading-snug text-muted">{t("sal.hint")}</p>

        <div className="grid grid-cols-2 gap-1.5">
          {(["cash", "upi"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChannel(c)}
              className={cn(
                "min-h-11 rounded-[var(--radius-md)] border text-[12px] font-semibold",
                channel === c
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted",
              )}
            >
              {c === "cash" ? t("sal.cash") : t("sal.upi")}
            </button>
          ))}
          {(["non_pf", "pf"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPfType(p)}
              className={cn(
                "min-h-11 rounded-[var(--radius-md)] border text-[12px] font-semibold",
                pfType === p
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted",
              )}
            >
              {p === "pf" ? t("sal.pf") : t("sal.nonPf")}
            </button>
          ))}
        </div>

        <div className="grid gap-1">
          <Label className="text-xs">{t("sal.basic")}</Label>
          <Input
            inputMode="numeric"
            value={basic}
            onChange={(e) => setBasic(e.target.value)}
          />
        </div>

        <div className="rounded-[var(--radius-md)] bg-elevated px-3 py-2 text-[12px]">
          <p>
            {t("sal.net")}: <span className="font-semibold tabular">{formatINR(preview.netPay)}</span>
          </p>
          {pfType === "pf" ? (
            <p className="text-muted">
              PF {formatINR(preview.pfEmployee)} + shop {formatINR(preview.pfEmployer)}
            </p>
          ) : null}
        </div>

        <Button className="h-11 w-full" onClick={make}>
          {t("sal.make", { month: monthLabel(month) })}
        </Button>

        {slips.map((s) => (
          <div
            key={s.id}
            className="rounded-[var(--radius-md)] border border-border px-3 py-2"
          >
            <p className="text-[13px] font-semibold text-fg">
              {monthLabel(s.month)} · {formatINR(s.netPay)}
            </p>
            <p className="text-[11px] text-muted">
              {s.pfType === "pf" ? t("sal.pf") : t("sal.nonPf")} ·{" "}
              {s.channel === "upi" ? t("sal.upi") : t("sal.cash")}
              {s.paidAt ? ` · ${t("pay.paid")}` : ""}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {!s.paidAt ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    markPaid(s.id);
                    toast.success(t("sal.marked"));
                  }}
                >
                  {t("sal.markPaid")}
                </Button>
              ) : (
                <span />
              )}
              <Button size="sm" onClick={() => send(s.id)}>
                {t("sal.wa")}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
