import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageGuide } from "@/components/page-guide";
import { PaymentBadge } from "@/components/payment-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useStockStore } from "@/lib/store";
import { formatDate, formatINR } from "@/lib/utils";
import { useT } from "@/lib/i18n-context";
import { effectivePaymentStatus, remainingAmount } from "@/lib/payment";
import { buildWhatsAppBillLink, openWhatsApp } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bills/")({
  component: BillsPage,
});

function BillsPage() {
  const { t } = useT();
  const sales = useStockStore((s) => s.sales);
  const shop = useStockStore((s) => s.shop);
  const upiId = useStockStore((s) => s.upiId);
  const recordPayment = useStockStore((s) => s.recordPayment);
  const [filter, setFilter] = useState<"all" | "paid" | "due">("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return sales.filter((s) => {
      const st = effectivePaymentStatus(s);
      const due = st === "pending" || st === "overdue" || st === "ledger";
      if (filter === "paid" && st !== "paid") return false;
      if (filter === "due" && !due) return false;
      if (!term) return true;
      const name = s.customerSnapshot?.name || "";
      return (
        s.billNo.toLowerCase().includes(term) ||
        name.toLowerCase().includes(term) ||
        (s.soldByName || "").toLowerCase().includes(term)
      );
    });
  }, [sales, filter, q]);

  const filters: { id: "all" | "paid" | "due"; label: string }[] = [
    { id: "all", label: t("pay.filterAll") },
    { id: "paid", label: t("pay.paid") },
    { id: "due", label: t("pay.due") },
  ];

  return (
    <AppShell title={t("bills.title")}>
      <div className="space-y-3.5 fade-in">
        <PageGuide
          text={t("guide.bills")}
          steps={[t("guide.bills1"), t("guide.bills2"), t("guide.bills3")]}
        />

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("bills.searchPh")}
            className="h-12 w-full rounded-full border border-border bg-surface pl-10 pr-4 text-base text-fg placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
          />
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "min-h-10 rounded-[var(--radius-md)] px-1 py-2 text-center text-[13px] font-semibold",
                filter === f.id
                  ? "bg-primary text-primary-fg"
                  : "bg-surface text-muted",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-border-strong px-4 py-8 text-center text-sm text-muted">
            {t("bills.empty")}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((sale) => {
              const open = openId === sale.id;
              const owed = remainingAmount(sale);
              const phone =
                sale.customerSnapshot?.whatsapp ||
                sale.customerSnapshot?.phone ||
                "";
              return (
                <Card key={sale.id} className="overflow-hidden">
                  <button
                    type="button"
                    className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    onClick={() => setOpenId(open ? null : sale.id)}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-fg">
                        {sale.customerSnapshot?.name || sale.billNo}
                      </p>
                      <p className="truncate text-[11px] text-muted">
                        {sale.billNo} · {formatDate(sale.createdAt)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular">
                        {formatINR(sale.totalRevenue)}
                      </p>
                      <PaymentBadge sale={sale} />
                    </div>
                  </button>
                  {open ? (
                    <CardContent className="space-y-2 border-t border-border pb-3 pt-2">
                      <ul className="space-y-1 text-[13px] text-muted">
                        {sale.lines.slice(0, 4).map((l, i) => (
                          <li key={`${l.productName}-${i}`} className="flex justify-between gap-2">
                            <span className="truncate">{l.productName}</span>
                            <span className="tabular">
                              ×{l.quantity} · {formatINR(l.quantity * l.unitPrice)}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {owed > 0 ? (
                        <p className="text-[13px] font-semibold text-fg">
                          {t("pay.remaining")} {formatINR(owed)}
                        </p>
                      ) : null}
                      <div className="grid grid-cols-3 gap-1.5">
                        <Button
                          size="sm"
                          disabled={owed <= 0}
                          onClick={() => {
                            recordPayment(sale.id, owed || sale.totalRevenue);
                            toast.success(t("pay.paid"));
                          }}
                        >
                          {t("pay.markPaid")}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={!phone}
                          onClick={() =>
                            openWhatsApp(
                              buildWhatsAppBillLink({
                                phone,
                                sale,
                                shopName: shop.name,
                                upiLink: upiId
                                  ? `upi://pay?pa=${upiId}&am=${owed}`
                                  : undefined,
                              }),
                            )
                          }
                        >
                          {t("nav.wa")}
                        </Button>
                        <Link
                          to="/bills/$saleId"
                          params={{ saleId: sale.id }}
                          className="block"
                        >
                          <Button size="sm" variant="outline" className="w-full">
                            {t("bills.open")}
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  ) : null}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
