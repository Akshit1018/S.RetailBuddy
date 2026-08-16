import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageGuide } from "@/components/page-guide";
import { PaySetupCard } from "@/components/pay-setup";
import { Button } from "@/components/ui/button";
import { useActiveProfile, useStockStore } from "@/lib/store";
import { effectiveStaffPerms } from "@/lib/staff";
import { shopPageUrl } from "@/lib/shop-order";
import {
  buildWhatsAppBillLink,
  buildPartyStatement,
  openWhatsApp,
} from "@/lib/whatsapp";
import { effectivePaymentStatus, remainingAmount } from "@/lib/payment";
import { formatINR } from "@/lib/utils";
import { useT } from "@/lib/i18n-context";

export const Route = createFileRoute("/whatsapp")({
  component: WhatsAppPage,
});

function digitsOf(phone: string) {
  const d = phone.replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d;
}

function WhatsAppPage() {
  const { t } = useT();
  const sales = useStockStore((s) => s.sales);
  const customers = useStockStore((s) => s.customers);
  const shop = useStockStore((s) => s.shop);
  const upiId = useStockStore((s) => s.upiId);
  const profile = useActiveProfile();
  const canWa = effectiveStaffPerms(profile).whatsapp;
  const [more, setMore] = useState(false);

  const due = useMemo(
    () =>
      sales.filter((s) => {
        const st = effectivePaymentStatus(s);
        return st === "pending" || st === "overdue" || st === "ledger";
      }),
    [sales],
  );

  const sendTo = (phone: string, text: string) => {
    const d = digitsOf(phone);
    if (d.length < 10) {
      toast.error(t("welcome.needPhone"));
      return;
    }
    openWhatsApp(`https://wa.me/${d}?text=${encodeURIComponent(text)}`);
  };

  const ready = Boolean(upiId && upiId.includes("@"));

  return (
    <AppShell title={t("wa.title")} subtitle={t("wa.sub")}>
      {!canWa ? (
        <p className="rounded-[var(--radius-lg)] bg-surface px-4 py-10 text-center text-sm text-muted">
          {t("staff.noWa")}
        </p>
      ) : (
        <div className="space-y-3.5 fade-in">
          <PageGuide
            text={t("guide.wa")}
            steps={[t("guide.wa1"), t("guide.wa2"), t("guide.wa3")]}
          />

          <PaySetupCard />

          <section className="space-y-2 rounded-[var(--radius-lg)] bg-surface px-3.5 py-4 shadow-[var(--shadow-card)]">
            <p className="text-sm font-semibold text-fg">
              {t("wa.due")}
              {due.length ? ` · ${due.length}` : ""}
            </p>
            {!ready ? (
              <p className="text-[12px] leading-snug text-muted">
                {t("wa.needSetup")}
              </p>
            ) : null}
            {due.length === 0 ? (
              <p className="text-sm text-muted">{t("wa.dueEmpty")}</p>
            ) : (
              <ul className="space-y-2">
                {due.slice(0, 8).map((s) => {
                  const phone =
                    s.customerSnapshot?.whatsapp ||
                    s.customerSnapshot?.phone ||
                    "";
                  const owed = remainingAmount(s);
                  return (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-fg">
                          {s.customerSnapshot?.name || s.billNo}
                        </p>
                        <p className="text-[11px] text-muted">
                          {formatINR(owed)} {t("pay.due")}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        disabled={!phone}
                        onClick={() => {
                          if (!phone) {
                            toast.error(t("wa.needPhone"));
                            return;
                          }
                          openWhatsApp(
                            buildWhatsAppBillLink({
                              phone,
                              sale: s,
                              shopName: shop.name,
                              upiLink: upiId
                                ? `upi://pay?pa=${upiId}&am=${owed}`
                                : undefined,
                            }),
                          );
                        }}
                      >
                        {t("wa.sendDue")}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <button
            type="button"
            onClick={() => setMore((v) => !v)}
            className="flex w-full items-center justify-between rounded-[var(--radius-lg)] bg-surface px-3.5 py-3 text-left text-sm font-semibold text-fg shadow-[var(--shadow-card)]"
          >
            {t("wa.more")}
            {more ? (
              <ChevronUp className="size-4 text-muted" />
            ) : (
              <ChevronDown className="size-4 text-muted" />
            )}
          </button>

          {more ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  className="h-11"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(shopPageUrl());
                      toast.success(t("shop.copied"));
                    } catch {
                      toast.message(shopPageUrl());
                    }
                  }}
                >
                  {t("wa.copyShop")}
                </Button>
                <Link to="/orders">
                  <Button variant="secondary" className="h-11 w-full">
                    {t("menu.orders")}
                  </Button>
                </Link>
              </div>

              <section className="space-y-2 rounded-[var(--radius-lg)] bg-surface px-3.5 py-4 shadow-[var(--shadow-card)]">
                <p className="text-sm font-semibold">{t("wa.statement")}</p>
                {customers.length === 0 ? (
                  <p className="text-sm text-muted">{t("wa.noCust")}</p>
                ) : (
                  <ul className="space-y-2">
                    {customers.slice(0, 6).map((c) => {
                      const phone = c.whatsapp || c.phone || "";
                      const theirs = sales.filter((s) => s.customerId === c.id);
                      return (
                        <li
                          key={c.id}
                          className="flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {c.name}
                            </p>
                            <p className="text-[11px] text-muted">
                              {theirs.length} {t("bills.title").toLowerCase()}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={!phone}
                            onClick={() =>
                              sendTo(
                                phone,
                                buildPartyStatement({
                                  shopName: shop.name,
                                  customerName: c.name,
                                  sales: theirs,
                                  upiId,
                                }),
                              )
                            }
                          >
                            {t("wa.sendStmt")}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
              <p className="px-1 text-[11px] text-muted">{t("wa.noApi")}</p>
            </div>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}
