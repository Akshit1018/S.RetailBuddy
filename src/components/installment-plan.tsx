import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStockStore } from "@/lib/store";
import type { SaleRecord } from "@/lib/types";
import { remainingAmount } from "@/lib/payment";
import { formatDate, formatINR } from "@/lib/utils";
import { nextOpenInstallment, ymd } from "@/lib/installments";
import { reminderText } from "@/lib/installments";
import { buildUpiLink, buildBillUpi } from "@/lib/upi";
import { openWhatsApp } from "@/lib/whatsapp";
import { payPageUrl } from "@/lib/staff";
import { useT } from "@/lib/i18n-context";
import { cn } from "@/lib/utils";

export function InstallmentPlan({ sale }: { sale: SaleRecord }) {
  const { t } = useT();
  const remaining = remainingAmount(sale);
  const schedule = useStockStore((s) => s.scheduleInstallments);
  const pay = useStockStore((s) => s.payInstallment);
  const createPayLink = useStockStore((s) => s.createPayLink);
  const shop = useStockStore((s) => s.shop);
  const upiId = useStockStore((s) => s.upiId);
  const [count, setCount] = useState("3");
  const [firstDue, setFirstDue] = useState(sale.nextDueDate || ymd());
  const [monthly, setMonthly] = useState(true);
  const [payAmt, setPayAmt] = useState("");

  if (remaining <= 0.01 && !sale.installments?.length) return null;

  const next = nextOpenInstallment(sale);

  const makePlan = () => {
    const res = schedule(sale.id, {
      count: Number(count) || 3,
      firstDue,
      monthly,
      gapDays: monthly ? undefined : 7,
    });
    if (!res.ok) toast.error(res.error);
    else toast.success(t("emi.saved"));
  };

  const collect = () => {
    const amt = Number(payAmt) || next?.amount || remaining;
    const res = pay(sale.id, amt, "Installment");
    if (!res.ok) toast.error(res.error);
    else {
      setPayAmt("");
      toast.success(t("pay.received"));
    }
  };

  const remind = () => {
    const phone =
      sale.customerSnapshot?.whatsapp || sale.customerSnapshot?.phone || "";
    if (!phone) {
      toast.error(t("bell.noPhone"));
      return;
    }
    const due = next?.amount || remaining;
    const made = createPayLink({
      saleId: sale.id,
      amount: due,
      customerPhone: phone,
    });
    const page = made.ok ? payPageUrl(made.token) : undefined;
    const upi = upiId
      ? buildUpiLink({
          pa: upiId,
          pn: shop.name,
          am: due,
          tn: sale.billNo,
        })
      : undefined;
    const text = reminderText({
      shopName: shop.name,
      customerName: sale.customerSnapshot?.name || "Customer",
      billNo: sale.billNo,
      amount: due,
      dueDate: next?.dueDate || firstDue,
      upiLink: upi,
      payPage: page,
    });
    const digits = phone.replace(/\D/g, "");
    const p = digits.length === 10 ? `91${digits}` : digits;
    openWhatsApp(`https://wa.me/${p}?text=${encodeURIComponent(text)}`);
    toast.success(t("emi.sent"));
  };

  return (
    <Card data-testid="installment-plan">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t("emi.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-[12px] leading-snug text-muted">{t("emi.hint")}</p>

        {sale.installments?.length ? (
          <ul className="space-y-1.5">
            {sale.installments.map((row) => {
              const done = row.paidAmount >= row.amount - 0.01;
              const dueNow = !done && row.dueDate <= ymd();
              return (
                <li
                  key={row.id}
                  className={cn(
                    "flex items-center justify-between rounded-[var(--radius-md)] px-3 py-2 text-[12px]",
                    done
                      ? "bg-success/10 text-success"
                      : dueNow
                        ? "bg-danger/10 text-fg"
                        : "bg-elevated text-fg",
                  )}
                >
                  <span>
                    {formatDate(row.dueDate)}
                    {row.note ? ` · ${row.note}` : ""}
                  </span>
                  <span className="tabular font-semibold">
                    {formatINR(row.amount)}
                    {done ? ` · ${t("pay.paid")}` : dueNow ? ` · ${t("emi.dueNow")}` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1">
              <Label className="text-xs">{t("emi.parts")}</Label>
              <Input
                inputMode="numeric"
                value={count}
                onChange={(e) => setCount(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">{t("pay.dueDate")}</Label>
              <Input
                type="date"
                value={firstDue}
                onChange={(e) => setFirstDue(e.target.value)}
              />
            </div>
            <label className="col-span-2 flex min-h-11 items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                className="size-4"
                checked={monthly}
                onChange={(e) => setMonthly(e.target.checked)}
              />
              {t("emi.monthly")}
            </label>
            <Button className="col-span-2 h-11" onClick={makePlan}>
              {t("emi.make")}
            </Button>
          </div>
        )}

        {remaining > 0.01 ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                type="number"
                value={payAmt}
                onChange={(e) => setPayAmt(e.target.value)}
                placeholder={
                  next
                    ? formatINR(next.amount - next.paidAmount)
                    : t("pay.partial")
                }
              />
              <Button variant="secondary" onClick={collect}>
                {t("emi.pay")}
              </Button>
            </div>
            <Button variant="sell" className="w-full" onClick={remind}>
              {t("emi.remind")}
            </Button>
            {upiId && next ? (
              <img
                src={
                  buildBillUpi({
                    upiId,
                    shopName: shop.name,
                    amountDue: next.amount - next.paidAmount,
                    billNo: sale.billNo,
                  }).qrUrl
                }
                alt="UPI"
                className="mx-auto max-h-36 rounded-[var(--radius-md)] border border-border bg-surface p-2"
              />
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
