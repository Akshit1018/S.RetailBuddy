import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageGuide } from "@/components/page-guide";
import { RoleGate } from "@/components/role-lock";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStockStore } from "@/lib/store";
import { formatINR } from "@/lib/utils";
import { useT } from "@/lib/i18n-context";

export const Route = createFileRoute("/returns")({
  component: ReturnsPage,
});

function ReturnsPage() {
  const { t } = useT();
  const sales = useStockStore((s) => s.sales);
  const products = useStockStore((s) => s.products);
  const notes = useStockStore((s) => s.returns);
  const submitReturn = useStockStore((s) => s.submitReturn);

  const [saleId, setSaleId] = useState("");
  const [reason, setReason] = useState("Customer return");
  const [code, setCode] = useState("");
  const [qty, setQty] = useState(1);

  const sale = sales.find((s) => s.id === saleId);
  const catalog = useMemo(() => {
    if (sale) return sale.lines;
    return products
      .filter((p) => p.quantity >= 0)
      .map((p) => ({
        productId: p.id,
        productCode: p.code,
        productName: p.name,
        quantity: 1,
        unitPrice: p.unitPrice,
      }));
  }, [sale, products]);

  const go = (productCode: string, q: number) => {
    const item = catalog.find(
      (l) => l.productCode.toLowerCase() === productCode.toLowerCase(),
    );
    if (!item) {
      toast.error(t("ret.notFound"));
      return;
    }
    const res = submitReturn({
      saleId: saleId || null,
      reason,
      lines: [
        {
          productId: "productId" in item ? item.productId : undefined,
          productCode: item.productCode,
          productName: item.productName,
          quantity: q,
          unitPrice: item.unitPrice,
        },
      ],
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`${res.noteNo} · ${formatINR(q * item.unitPrice)}`);
    setCode("");
    setQty(1);
  };

  return (
    <AppShell title={t("ret.title")} subtitle={t("ret.sub")}>
      <RoleGate need="returns">
      <div className="space-y-3.5 fade-in">
        <PageGuide text={t("guide.returns")} />
        <Card className="border-0">
          <CardContent className="space-y-3 py-4">
            <div className="grid gap-1.5">
              <Label>{t("ret.fromBill")}</Label>
              <select
                className="h-11 w-full rounded-[var(--radius-md)] border border-border bg-elevated px-3 text-base"
                value={saleId}
                onChange={(e) => setSaleId(e.target.value)}
              >
                <option value="">{t("ret.any")}</option>
                {sales.slice(0, 40).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.billNo} · {formatINR(s.totalRevenue)}
                  </option>
                ))}
              </select>
            </div>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("ret.reason")}
            />
            <div className="flex items-center gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t("ret.code")}
                className="min-w-0 flex-1"
              />
              <Button
                type="button"
                size="icon"
                variant="secondary"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                <Minus className="size-4" />
              </Button>
              <span className="w-8 text-center tabular">{qty}</span>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                onClick={() => setQty((q) => q + 1)}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            <Button className="w-full" onClick={() => go(code.trim(), qty)}>
              {t("ret.submit")}
            </Button>
          </CardContent>
        </Card>

        <div className="max-h-52 space-y-1 overflow-auto">
          {catalog.slice(0, 20).map((l) => (
            <button
              key={l.productCode}
              type="button"
              className="flex min-h-11 w-full items-center justify-between rounded-[var(--radius-md)] bg-surface px-3 py-2 text-left text-sm shadow-[var(--shadow-card)]"
              onClick={() => go(l.productCode, qty)}
            >
              <span className="truncate">{l.productName}</span>
              <span className="text-xs text-muted tabular">
                {formatINR(l.unitPrice)}
              </span>
            </button>
          ))}
        </div>

        <h2 className="text-sm font-semibold text-fg">{t("ret.history")}</h2>
        {notes.length === 0 ? (
          <p className="text-sm text-muted">{t("ret.empty")}</p>
        ) : (
          <ul className="space-y-2">
            {notes.map((n) => (
              <li key={n.id}>
                <Card className="border-0">
                  <CardContent className="py-3">
                    <p className="font-semibold text-fg">
                      {n.noteNo} · {formatINR(n.total)}
                    </p>
                    <p className="text-xs text-muted">
                      {n.billNo || "—"} · {n.reason}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
      </RoleGate>
    </AppShell>
  );
}
