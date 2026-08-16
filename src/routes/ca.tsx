import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageGuide } from "@/components/page-guide";
import { RoleGate } from "@/components/role-lock";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActiveProfile, useStockStore } from "@/lib/store";
import {
  buildCaPack,
  downloadLockedPack,
  exportGstrZipLike,
  packWhatsApp,
  schemeLabel,
} from "@/lib/ca-pack";
import { currentMonth, monthLabel } from "@/lib/salary";
import { formatINR } from "@/lib/utils";
import { openWhatsApp } from "@/lib/whatsapp";
import type { GstScheme } from "@/lib/types";
import { useT } from "@/lib/i18n-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ca")({
  component: CaPage,
});

function CaPage() {
  const { t } = useT();
  const store = useStockStore();
  const me = useActiveProfile();
  const [month, setMonth] = useState(currentMonth());
  const [pin, setPin] = useState(store.settings.caPin || "1234");
  const [caPhone, setCaPhone] = useState(store.settings.caPhone || "");

  const pack = useMemo(
    () =>
      buildCaPack({
        month,
        scheme: store.settings.gstScheme,
        sales: store.sales,
        invoices: store.invoices,
        returns: store.returns,
        dayCloses: store.dayCloses,
        slips: store.salarySlips,
      }),
    [
      month,
      store.settings.gstScheme,
      store.sales,
      store.invoices,
      store.returns,
      store.dayCloses,
      store.salarySlips,
    ],
  );

  const closed = store.monthCloses.find((m) => m.month === month);

  const setScheme = (gstScheme: GstScheme) => {
    store.updateSettings({ gstScheme });
  };

  const savePin = () => {
    store.updateSettings({ caPin: pin, caPhone: caPhone || null });
    toast.success(t("common.save"));
  };

  const download = () => {
    store.updateSettings({ caPin: pin, caPhone: caPhone || null });
    downloadLockedPack({
      shop: store.shop,
      pack,
      pin: pin || "1234",
      closes: store.dayCloses,
      slips: store.salarySlips,
    });
    toast.success(t("ca.downloaded"));
  };

  const sendCa = () => {
    const phone = (caPhone || store.settings.caPhone || "").replace(/\D/g, "");
    if (phone.length < 10) {
      toast.error(t("ca.needPhone"));
      return;
    }
    store.updateSettings({ caPin: pin, caPhone: phone });
    downloadLockedPack({
      shop: store.shop,
      pack,
      pin: pin || "1234",
      closes: store.dayCloses,
      slips: store.salarySlips,
    });
    const text = packWhatsApp(store.shop, pack) + `\n\nPIN: ${pin || "1234"}\n(Send the downloaded file on this chat.)`;
    const p = phone.length === 10 ? `91${phone}` : phone;
    openWhatsApp(`https://wa.me/${p}?text=${encodeURIComponent(text)}`);
    toast.success(t("ca.sent"));
  };

  const bookClose = () => {
    const res = store.closeMonth(month);
    if (!res.ok) toast.error(res.error);
    else toast.success(t("ca.closed"));
  };

  const gstr = () => {
    if (store.settings.gstScheme !== "regular") {
      toast.message(t("ca.noGstr"));
      return;
    }
    exportGstrZipLike(month, store.sales, store.settings.stateCode);
    toast.success(t("gstr.exported", { period: month }));
  };

  const rows: [string, string][] = [
    [t("ca.sales"), `${pack.salesCount} · ${formatINR(pack.salesTotal)}`],
    [t("ca.paid"), formatINR(pack.salesPaid)],
    [t("ca.credit"), formatINR(pack.salesCredit)],
    [t("ca.buy"), `${pack.purchaseCount} · ${formatINR(pack.purchaseTotal)}`],
    [t("ca.ret"), formatINR(pack.returns)],
    [t("ca.gstOut"), formatINR(pack.gstOut)],
    [t("ca.gstIn"), formatINR(pack.gstIn)],
    [t("ca.gstNet"), formatINR(pack.gstNet)],
    [t("ca.cash"), formatINR(pack.cash)],
    [t("ca.upi"), formatINR(pack.upi)],
    [t("ca.salary"), formatINR(pack.salaries)],
  ];

  return (
    <AppShell title={t("ca.title")} subtitle={t("ca.sub")}>
      <RoleGate need="books">
        <div className="space-y-3.5 fade-in" data-testid="ca-pack">
          <PageGuide text={t("guide.ca")} />
          <Card className="border-0">
            <CardContent className="space-y-3 py-4">
              <p className="text-[13px] leading-relaxed text-muted">{t("ca.hint")}</p>
              <div className="grid gap-1.5">
                <Label>{t("ca.month")}</Label>
                <Input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                />
              </div>
              <p className="text-[11px] text-muted">{schemeLabel(store.settings.gstScheme)}</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    ["regular", t("ca.regular")],
                    ["composition", t("ca.comp")],
                    ["unregistered", t("ca.unreg")],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setScheme(id)}
                    className={cn(
                      "min-h-11 rounded-[var(--radius-md)] border px-1 text-[11px] font-semibold",
                      store.settings.gstScheme === id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {monthLabel(month)}
                {closed ? ` · ${t("ca.locked")}` : ""}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 pb-4">
              {rows.map(([k, v]) => (
                <div key={k} className="flex justify-between text-[13px]">
                  <span className="text-muted">{k}</span>
                  <span className="tabular font-medium text-fg">{v}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-0">
            <CardContent className="space-y-3 py-4">
              <div className="grid gap-1.5">
                <Label>{t("ca.phone")}</Label>
                <Input
                  inputMode="tel"
                  value={caPhone}
                  onChange={(e) => setCaPhone(e.target.value)}
                  placeholder="98xxxxxxxx"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("ca.pin")}</Label>
                <Input
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength={6}
                />
              </div>
              <Button variant="outline" className="w-full" onClick={savePin}>
                {t("common.save")}
              </Button>
              <Button className="h-12 w-full" onClick={download}>
                {t("ca.download")}
              </Button>
              <Button variant="sell" className="h-12 w-full" onClick={sendCa}>
                {t("ca.send")}
              </Button>
              <Button variant="secondary" className="w-full" onClick={gstr}>
                {t("ca.gstr")}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={Boolean(closed)}
                onClick={bookClose}
              >
                {closed ? t("ca.locked") : t("ca.close")}
              </Button>
              <p className="text-[11px] leading-snug text-muted">{t("ca.fileNote")}</p>
            </CardContent>
          </Card>
          <p className="sr-only">{me?.name}</p>
        </div>
      </RoleGate>
    </AppShell>
  );
}
