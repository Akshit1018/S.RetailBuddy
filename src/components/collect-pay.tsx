import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStockStore } from "@/lib/store";
import { buildBillUpi } from "@/lib/upi";
import { payPageUrl } from "@/lib/staff";
import { formatINR } from "@/lib/utils";
import { openWhatsApp } from "@/lib/whatsapp";
import { useT } from "@/lib/i18n-context";

export function CollectPayCard({
  amount,
  saleId,
  defaultPhone,
  billNo,
}: {
  amount: number;
  saleId?: string | null;
  defaultPhone?: string;
  billNo?: string;
}) {
  const { t } = useT();
  const shop = useStockStore((s) => s.shop);
  const upiId = useStockStore((s) => s.upiId);
  const paymentQr = useStockStore((s) => s.paymentQrDataUrl);
  const createPayLink = useStockStore((s) => s.createPayLink);
  const [phone, setPhone] = useState(defaultPhone || "");

  const ref = billNo || t("staff.payLink");
  const upi = upiId
    ? buildBillUpi({
        upiId,
        shopName: shop.name,
        amountDue: amount,
        billNo: ref,
      })
    : null;

  const send = () => {
    if (!phone.trim()) {
      toast.error(t("welcome.needPhone"));
      return;
    }
    const made = createPayLink({
      saleId: saleId ?? null,
      amount,
      customerPhone: phone.trim(),
    });
    if (!made.ok) {
      toast.error(made.error);
      return;
    }
    const page = payPageUrl(made.token);
    const digits = phone.replace(/\D/g, "");
    const wa = digits.length === 10 ? `91${digits}` : digits;
    const text = `${shop.name}${billNo ? ` — ${billNo}` : ""}\nPay ${formatINR(amount)}\n${page}`;
    openWhatsApp(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`);
    toast.success(t("staff.linkSent"));
  };

  return (
    <Card className="border-0">
      <CardContent className="space-y-3 py-4">
        <p className="text-[14px] font-semibold text-fg">{t("staff.collect")}</p>
        <p className="text-[12px] leading-snug text-muted">{t("staff.collectHint")}</p>
        {upi ? (
          <img
            src={upi.qrUrl}
            alt="UPI QR"
            className="mx-auto h-40 w-40 rounded-md bg-surface object-contain"
          />
        ) : paymentQr ? (
          <img
            src={paymentQr}
            alt="Shop QR"
            className="mx-auto max-h-40 rounded-md object-contain"
          />
        ) : (
          <p className="py-4 text-center text-[12px] text-muted">
            {t("pay.noQr")}{" "}
            <Link to="/whatsapp" className="font-semibold text-primary">
              {t("wa.title")}
            </Link>
          </p>
        )}
        <dl className="space-y-1 text-[12px]">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">{t("staff.upi")}</dt>
            <dd className="font-semibold text-fg">{upiId || "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">{t("on.phone")}</dt>
            <dd className="font-semibold text-fg">{shop.phone || shop.whatsapp || "—"}</dd>
          </div>
        </dl>
        <div className="grid gap-1.5">
          <Label>{t("sell.waNumber")}</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="9876543210"
          />
        </div>
        <Button type="button" variant="secondary" className="h-11 w-full" onClick={send}>
          {t("staff.sendLink")}
        </Button>
      </CardContent>
    </Card>
  );
}
