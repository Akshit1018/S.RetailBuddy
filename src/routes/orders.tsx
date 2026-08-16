import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageGuide } from "@/components/page-guide";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useStockStore } from "@/lib/store";
import { formatINR } from "@/lib/utils";
import { useT } from "@/lib/i18n-context";

export const Route = createFileRoute("/orders")({
  component: OrdersPage,
});

function OrdersPage() {
  const { t } = useT();
  const orders = useStockStore((s) => s.shopOrders);
  const importShopOrder = useStockStore((s) => s.importShopOrder);
  const setStatus = useStockStore((s) => s.setShopOrderStatus);
  const bill = useStockStore((s) => s.billShopOrder);
  const [raw, setRaw] = useState("");

  const paste = () => {
    const res = importShopOrder(raw);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setRaw("");
    toast.success(t("ord.imported"));
  };

  return (
    <AppShell title={t("ord.title")} subtitle={t("ord.sub")}>
      <div className="space-y-3.5 fade-in">
        <PageGuide text={t("guide.orders")} />
        <Card className="border-0">
          <CardContent className="space-y-2 py-4">
            <p className="text-sm text-muted">{t("ord.pasteHint")}</p>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={4}
              className="w-full rounded-[var(--radius-md)] border border-border bg-elevated px-3 py-2 font-mono text-xs"
              placeholder="SS1.eyJ2IjoxLC4uLi or full WhatsApp text"
            />
            <Button className="w-full" onClick={paste}>
              {t("ord.import")}
            </Button>
          </CardContent>
        </Card>

        {orders.length === 0 ? (
          <p className="rounded-[var(--radius-xl)] border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
            {t("ord.empty")}
          </p>
        ) : (
          <ul className="space-y-2">
            {orders.map((o) => (
              <li key={o.id}>
                <Card className="border-0">
                  <CardContent className="space-y-2 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-fg">{o.customerName}</p>
                        <p className="text-xs text-muted">
                          {o.customerPhone || "—"} · {o.fulfillment} · {o.status}
                        </p>
                      </div>
                      <p className="tabular font-semibold">{formatINR(o.total)}</p>
                    </div>
                    <ul className="text-xs text-muted">
                      {o.lines.map((l) => (
                        <li key={l.productCode}>
                          {l.productName} × {l.quantity}
                        </li>
                      ))}
                    </ul>
                    {o.status !== "billed" && o.status !== "cancelled" ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            const res = bill(o.id);
                            if (!res.ok) toast.error(res.error);
                            else toast.success(res.billNo);
                          }}
                        >
                          {t("ord.bill")}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setStatus(o.id, "cancelled")}
                        >
                          {t("common.cancel")}
                        </Button>
                      </div>
                    ) : o.saleId ? (
                      <Link to="/bills/$saleId" params={{ saleId: o.saleId }}>
                        <Button variant="outline" className="w-full">
                          {t("bills.openPrint")}
                        </Button>
                      </Link>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
