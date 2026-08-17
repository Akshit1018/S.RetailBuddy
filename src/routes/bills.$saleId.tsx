import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PaymentBadge } from "@/components/payment-badge";
import { HelpTip } from "@/components/help-tip";
import { ImageCapture } from "@/components/image-capture";
import { VoiceRemark } from "@/components/voice-remark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActiveProfile, useStockStore } from "@/lib/store";
import {
  cn,
  formatDateTime,
  formatINR,
  rolesLabel,
} from "@/lib/utils";
import { useT } from "@/lib/i18n-context";
import {
  effectivePaymentStatus,
  paidProgress,
  remainingAmount,
} from "@/lib/payment";
import type { PaymentStatus } from "@/lib/types";
import { buildWhatsAppBillLink, openWhatsApp } from "@/lib/whatsapp";
import { GstBlock } from "@/components/gst-block";
import { BillProof } from "@/components/bill-proof";
import { BillFormatPicker } from "@/components/bill-format-picker";
import { InstallmentPlan } from "@/components/installment-plan";
import { buildBillUpi, buildUpiLink } from "@/lib/upi";
import { payPageUrl, effectiveStaffPerms } from "@/lib/staff";
import { Textarea } from "@/components/ui/textarea";
import { printTitle } from "@/lib/bill-formats";
import type { BillFormat } from "@/lib/types";

export const Route = createFileRoute("/bills/$saleId")({
  component: BillDetailPage,
});

function BillDetailPage() {
  const { saleId } = Route.useParams();
  const { t } = useT();
  const sale = useStockStore((s) => s.sales.find((x) => x.id === saleId));
  const paymentQr = useStockStore((s) => s.paymentQrDataUrl);
  const upiId = useStockStore((s) => s.upiId);
  const recordPayment = useStockStore((s) => s.recordPayment);
  const setPaymentStatus = useStockStore((s) => s.setPaymentStatus);
  const markPaymentChecked = useStockStore((s) => s.markPaymentChecked);
  const createPayLink = useStockStore((s) => s.createPayLink);
  const attachSaleProof = useStockStore((s) => s.attachSaleProof);
  const setSaleFormats = useStockStore((s) => s.setSaleFormats);
  const gstScheme = useStockStore((s) => s.settings.gstScheme);
  const shopCard = useStockStore((s) => s.shop);
  const me = useActiveProfile();
  const canCollect = effectiveStaffPerms(me).collectPay;
  const shop = useStockStore((s) => {
    const p = s.profiles.find((x) => x.id === sale?.soldByProfileId);
    return p?.shopName || s.shop.name || s.profiles[0]?.shopName || "Retail Buddy";
  });

  const [partial, setPartial] = useState("");
  const [waPhone, setWaPhone] = useState(
    sale?.customerSnapshot?.whatsapp || "",
  );
  const [dueDate, setDueDate] = useState(sale?.nextDueDate || "");
  const [installment, setInstallment] = useState(
    sale?.monthlyInstallment?.toString() || "",
  );
  const [remark, setRemark] = useState(sale?.orderRemark || "");
  const [voice, setVoice] = useState<string | null>(sale?.voiceRemarkDataUrl || null);

  if (!sale) {
    return (
      <AppShell title={t("bill.title")} hideSell>
        <div className="space-y-4 py-10 text-center">
          <p className="text-sm text-muted">Bill not found.</p>
          <Link to="/bills">
            <Button variant="secondary" className="w-full max-w-xs">
              {t("common.back")}
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const status = effectivePaymentStatus(sale);
  const remaining = remainingAmount(sale);
  const progress = paidProgress(sale);

  const setStatus = (s: PaymentStatus) => {
    if (s === "ledger") {
      setPaymentStatus(sale.id, "ledger", {
        nextDueDate: dueDate || null,
        monthlyInstallment: installment ? Number(installment) : null,
      });
      toast.success(t("pay.ledger"));
      return;
    }
    if (s === "paid") {
      setPaymentStatus(sale.id, "paid");
      toast.success(t("pay.markPaid"));
      return;
    }
    setPaymentStatus(sale.id, s);
    toast.success(t("bills.payStatus"));
  };

  const addPartial = () => {
    const amt = Number(partial);
    if (!amt || amt <= 0) {
      toast.error("Enter amount");
      return;
    }
    const res = recordPayment(sale.id, amt, "Partial");
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setPartial("");
    toast.success(t("pay.received"));
  };

  const shareWa = () => {
    if (!waPhone.trim()) {
      toast.error("Enter WhatsApp number");
      return;
    }
    const url = buildWhatsAppBillLink({
      phone: waPhone.trim(),
      sale,
      shopName: shop,
      hasQr: Boolean(paymentQr),
      upiLink: upiId
        ? buildUpiLink({
            pa: upiId,
            pn: shop,
            am: remaining || sale.totalRevenue,
            tn: sale.billNo,
          })
        : undefined,
    });
    openWhatsApp(url);
  };

  const sendPayLink = () => {
    if (!waPhone.trim()) {
      toast.error("Enter WhatsApp number");
      return;
    }
    const made = createPayLink({
      saleId: sale.id,
      amount: remaining || sale.totalRevenue,
      customerPhone: waPhone.trim(),
      remark: remark || null,
    });
    if (!made.ok) {
      toast.error(made.error);
      return;
    }
    const page = payPageUrl(made.token);
    const digits = waPhone.replace(/\D/g, "");
    const phone = digits.length === 10 ? `91${digits}` : digits;
    const text = `${shop} — ${sale.billNo}\nPay ${formatINR(remaining || sale.totalRevenue)}\n${page}`;
    openWhatsApp(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`);
    toast.success(t("staff.linkSent"));
  };

  const saveProof = (dataUrl: string) => {
    const res = attachSaleProof(sale.id, {
      paymentProofDataUrl: dataUrl,
      orderRemark: remark || null,
      voiceRemarkDataUrl: voice,
    });
    if (!res.ok) toast.error(res.error);
    else toast.success(t("staff.proofSaved"));
  };

  return (
    <AppShell
      title={sale.billNo}
      subtitle={t("bill.title")}
      hideSell
      tipKey="tip.payment"
    >
      <div className="space-y-3.5 fade-in no-print">
        <div className="grid grid-cols-2 gap-2">
          <Link to="/bills">
            <Button variant="outline" className="h-11 w-full">
              <ArrowLeft className="size-4" />
              {t("common.back")}
            </Button>
          </Link>
          <Button className="h-11 w-full" onClick={() => window.print()}>
            <Printer className="size-4" />
            {t("common.print")}
          </Button>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => {
            document.body.classList.add("thermal-print");
            window.print();
            window.setTimeout(() => document.body.classList.remove("thermal-print"), 400);
          }}
        >
          {t("common.print58")}
        </Button>

        {sale.imageDataUrl ? <BillProof src={sale.imageDataUrl} /> : null}

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">{t("bills.payStatus")}</CardTitle>
            <div className="flex items-center gap-1">
              <PaymentBadge sale={sale} />
              <HelpTip tipKey="tip.payment" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted">{t("pay.autoNote")}</p>

            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {(
                [
                  ["paid", t("pay.paid"), "green"],
                  ["pending", t("pay.pending"), "yellow"],
                  ["overdue", t("pay.overdue"), "red"],
                  ["ledger", t("pay.ledger"), "info"],
                ] as const
              ).map(([id, label, tone]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStatus(id)}
                  className={cn(
                    "min-h-11 rounded-[var(--radius-md)] border px-2 py-2 text-center text-[11px] font-semibold",
                    status === id
                      ? tone === "green"
                        ? "bg-bucket-green text-bucket-green-fg"
                        : tone === "yellow"
                          ? "bg-bucket-yellow text-bucket-yellow-fg"
                          : tone === "red"
                            ? "bg-bucket-red text-bucket-red-fg"
                            : "bg-info text-bg"
                      : "border-border text-muted",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div>
              <div className="mb-1 flex justify-between text-xs text-muted">
                <span>{t("pay.progress")}</span>
                <span className="tabular">
                  {formatINR(sale.amountPaid)} / {formatINR(sale.totalRevenue)}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-elevated">
                <div
                  className="h-full rounded-full bg-bucket-green transition-all"
                  style={{ width: `${Math.min(100, progress * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted">
                {t("pay.remaining")}:{" "}
                <span className="font-medium text-fg tabular">
                  {formatINR(remaining)}
                </span>
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={partial}
                onChange={(e) => setPartial(e.target.value)}
                placeholder={t("pay.partial")}
                className="min-w-0 flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={addPartial}
              >
                {t("pay.received")}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setPaymentStatus(sale.id, "paid");
                  toast.success(t("pay.markPaid"));
                }}
              >
                {t("pay.markPaid")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  markPaymentChecked(sale.id);
                  toast.success(t("pay.checked"));
                }}
              >
                {t("pay.checked")}
              </Button>
            </div>

            {status === "ledger" || status === "overdue" ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="grid gap-1">
                  <Label className="text-xs">{t("pay.dueDate")}</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">{t("pay.installment")}</Label>
                  <Input
                    type="number"
                    value={installment}
                    onChange={(e) => setInstallment(e.target.value)}
                    placeholder="₹ / month"
                  />
                </div>
                <Button
                  type="button"
                  className="w-full sm:col-span-2"
                  onClick={() => setStatus("ledger")}
                >
                  {t("pay.toLedger")}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("fmt.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <BillFormatPicker
              value={sale.billFormats?.length ? sale.billFormats : ["retail"]}
              onChange={(formats: BillFormat[]) => setSaleFormats(sale.id, formats)}
              scheme={gstScheme}
              irn={sale.irn}
              ewbNo={sale.ewbNo}
              onMeta={(patch) =>
                setSaleFormats(sale.id, sale.billFormats || ["retail"], patch)
              }
            />
          </CardContent>
        </Card>

        <InstallmentPlan sale={sale} />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("common.shareWa")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-1.5">
              <Label htmlFor="wa">{t("sell.waNumber")}</Label>
              <Input
                id="wa"
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                placeholder="9876543210"
                inputMode="tel"
              />
            </div>
            {upiId && remaining > 0 ? (
              <img
                src={
                  buildBillUpi({
                    upiId,
                    shopName: shop,
                    amountDue: remaining,
                    billNo: sale.billNo,
                  }).qrUrl
                }
                alt="UPI QR"
                className="mx-auto max-h-40 rounded-[var(--radius-md)] border border-border object-contain bg-surface p-2"
              />
            ) : paymentQr ? (
              <img
                src={paymentQr}
                alt="Payment QR"
                className="mx-auto max-h-36 rounded-[var(--radius-md)] border border-border object-contain"
              />
            ) : (
              <p className="text-center text-xs text-warning">
                {t("pay.noQr")}{" "}
                <Link to="/profile" className="text-primary underline">
                  {t("profile.title")}
                </Link>
              </p>
            )}
            <Button
              type="button"
              variant="sell"
              className="w-full"
              onClick={shareWa}
            >
              <Share2 className="size-4" />
              {t("pay.shareQr")}
            </Button>
            {canCollect ? (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={sendPayLink}
            >
              {t("staff.sendLink")}
            </Button>
            ) : null}
            {upiId ? (
              <a
                href={buildUpiLink({
                  pa: upiId,
                  pn: shop,
                  am: remaining || sale.totalRevenue,
                  tn: sale.billNo,
                })}
                className="block"
              >
                <Button type="button" variant="secondary" className="w-full">
                  {t("upi.pay")}
                </Button>
              </a>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("staff.proofTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-[12px] text-muted">{t("staff.proofHint")}</p>
            <ImageCapture
              value={sale.paymentProofDataUrl}
              onChange={saveProof}
              label={t("staff.proofBtn")}
              hint={t("staff.proofHint")}
              cameraLabel={t("staff.capture")}
              galleryLabel={t("staff.gallery")}
            />
            {sale.paymentProofAt ? (
              <p className="text-[11px] text-muted">
                {t("staff.proofAt", { at: formatDateTime(sale.paymentProofAt) })}
              </p>
            ) : null}
            <div className="grid gap-1.5">
              <Label>{t("staff.remark")}</Label>
              <Textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={2}
              />
            </div>
            <VoiceRemark
              value={voice}
              onChange={(v) => {
                setVoice(v);
                attachSaleProof(sale.id, {
                  voiceRemarkDataUrl: v,
                  orderRemark: remark || null,
                });
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              onClick={() => {
                attachSaleProof(sale.id, {
                  orderRemark: remark || null,
                  voiceRemarkDataUrl: voice,
                });
                toast.success(t("staff.saved"));
              }}
            >
              {t("staff.saveRemark")}
            </Button>
            <p className="text-[11px] text-muted">
              {t("staff.shopPhone")}: {shopCard.phone || shopCard.whatsapp || "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 py-4 text-sm">
            <p>
              <span className="text-muted">{t("bills.soldBy")}</span>
              <br />
              <span className="font-semibold text-fg">
                {sale.soldByName || "—"}
              </span>
              <span className="text-muted">
                {" "}
                · {rolesLabel(sale.soldByRoles)}
              </span>
            </p>
            {sale.customerSnapshot ? (
              <p>
                <span className="text-muted">{t("sell.customer")}</span>
                <br />
                <span className="font-medium text-fg">
                  {sale.customerSnapshot.name}
                </span>
                {sale.customerSnapshot.whatsapp ? (
                  <span className="text-muted">
                    {" "}
                    · {sale.customerSnapshot.whatsapp}
                  </span>
                ) : null}
              </p>
            ) : null}
            <p className="text-xs text-muted">
              {formatDateTime(sale.createdAt)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sale.lines.map((line, idx) => (
              <div
                key={`${line.productCode}-${idx}`}
                className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">
                    {line.productName}
                  </p>
                  <p className="text-[11px] text-muted tabular">
                    {line.quantity} × {formatINR(line.unitPrice)}
                    {line.hsn ? ` · HSN ${line.hsn}` : ""}
                    {line.gstRate != null ? ` · ${line.gstRate}%` : ""}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular">
                  {formatINR(line.quantity * line.unitPrice)}
                </p>
              </div>
            ))}
            <GstBlock
              taxable={sale.taxableAmount}
              cgst={sale.cgst}
              sgst={sale.sgst}
              total={sale.totalRevenue}
            />
            {sale.discountPct ? (
              <p className="text-[12px] text-muted">
                {t("staff.discount")}: {sale.discountPct}%
                {sale.discountAmount ? ` · ${formatINR(sale.discountAmount)}` : ""}
              </p>
            ) : null}
            {sale.orderRemark ? (
              <p className="rounded-[var(--radius-md)] bg-elevated px-3 py-2 text-[12px] text-fg">
                {sale.orderRemark}
              </p>
            ) : null}
            {sale.voiceRemarkDataUrl ? (
              <audio controls src={sale.voiceRemarkDataUrl} className="w-full" />
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="print-bill hidden print:block">
        <p style={{ fontSize: 11, letterSpacing: "0.08em", marginBottom: 4 }}>
          {printTitle(sale.billFormats, gstScheme)}
        </p>
        <h1 style={{ fontSize: 18, marginBottom: 8 }}>{shop}</h1>
        <p style={{ marginBottom: 4 }}>
          <strong>{sale.billNo}</strong> · {formatDateTime(sale.createdAt)}
        </p>
        <p style={{ marginBottom: 12 }}>
          Sold by: {sale.soldByName} ({rolesLabel(sale.soldByRoles)})
        </p>
        {sale.customerSnapshot ? (
          <p style={{ marginBottom: 12 }}>
            Customer: {sale.customerSnapshot.name}
            {sale.customerSnapshot.whatsapp
              ? ` · ${sale.customerSnapshot.whatsapp}`
              : ""}
          </p>
        ) : null}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                Item
              </th>
              <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>
                Qty
              </th>
              <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>
                Rate
              </th>
              <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {sale.lines.map((l, idx) => (
              <tr key={`${l.productCode}-${idx}`}>
                <td style={{ padding: "6px 0" }}>{l.productName}</td>
                <td style={{ textAlign: "right" }}>{l.quantity}</td>
                <td style={{ textAlign: "right" }}>
                  {formatINR(l.unitPrice)}
                </td>
                <td style={{ textAlign: "right" }}>
                  {formatINR(l.quantity * l.unitPrice)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ marginTop: 12, textAlign: "right", fontWeight: 700 }}>
          Taxable: {formatINR(sale.taxableAmount ?? sale.totalRevenue)}
          <br />
          CGST: {formatINR(sale.cgst ?? 0)} · SGST: {formatINR(sale.sgst ?? 0)}
          <br />
          Total: {formatINR(sale.totalRevenue)}
        </p>
        <p style={{ marginTop: 4, textAlign: "right" }}>
          Paid: {formatINR(sale.amountPaid)} · Due: {formatINR(remaining)}
        </p>
        {sale.irn ? <p style={{ marginTop: 8, fontSize: 11 }}>IRN: {sale.irn}</p> : null}
        {sale.ewbNo ? <p style={{ fontSize: 11 }}>E-way: {sale.ewbNo}</p> : null}
        {gstScheme === "composition" ? (
          <p style={{ marginTop: 8, fontSize: 11 }}>
            Composition dealer — tax not collected on this bill.
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}
