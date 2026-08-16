import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageGuide } from "@/components/page-guide";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStockStore } from "@/lib/store";
import { formatINR } from "@/lib/utils";
import { useT } from "@/lib/i18n-context";

export const Route = createFileRoute("/suppliers")({
  component: SuppliersPage,
});

function SuppliersPage() {
  const { t } = useT();
  const suppliers = useStockStore((s) => s.suppliers);
  const upsert = useStockStore((s) => s.upsertSupplier);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gstin, setGstin] = useState("");

  const add = () => {
    if (!name.trim()) {
      toast.error(t("on.needName"));
      return;
    }
    upsert({ name, phone, gstin });
    setName("");
    setPhone("");
    setGstin("");
    toast.success(t("common.save"));
  };

  return (
    <AppShell title={t("sup.title")} subtitle={t("sup.sub")}>
      <div className="space-y-3.5 fade-in">
        <PageGuide text={t("guide.suppliers")} />
        <Card className="border-0">
          <CardContent className="space-y-2 py-4">
            <Label>{t("sup.add")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("sup.name")}
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("on.phone")}
                inputMode="tel"
              />
              <Input
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="GSTIN"
              />
            </div>
            <Button className="w-full" onClick={add}>
              {t("sup.add")}
            </Button>
          </CardContent>
        </Card>

        {suppliers.length === 0 ? (
          <p className="rounded-[var(--radius-xl)] border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
            {t("sup.empty")}
          </p>
        ) : (
          <ul className="space-y-2">
            {suppliers.map((s) => (
              <li key={s.id}>
                <Card className="border-0">
                  <CardContent className="space-y-1 py-3">
                    <p className="font-semibold text-fg">{s.name}</p>
                    <p className="text-xs text-muted">
                      {s.gstin || "—"} {s.phone ? `· ${s.phone}` : ""}
                    </p>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">{t("sup.last")}</span>
                      <span className="tabular">{formatINR(s.lastAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">{t("sup.due")}</span>
                      <span className="font-semibold tabular">
                        {formatINR(s.dueAmount)}
                      </span>
                    </div>
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
