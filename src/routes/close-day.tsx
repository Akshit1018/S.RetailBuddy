import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageGuide } from "@/components/page-guide";
import { RoleGate } from "@/components/role-lock";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStockStore } from "@/lib/store";
import { formatDate, formatINR, todayISO } from "@/lib/utils";
import { useT } from "@/lib/i18n-context";

export const Route = createFileRoute("/close-day")({
  component: CloseDayPage,
});

function CloseDayPage() {
  const { t } = useT();
  const sales = useStockStore((s) => s.sales);
  const returns = useStockStore((s) => s.returns);
  const closes = useStockStore((s) => s.dayCloses);
  const closeDay = useStockStore((s) => s.closeDay);
  const today = todayISO().slice(0, 10);
  const todays = sales.filter((s) => s.createdAt.slice(0, 10) === today);
  const retToday = returns.filter((r) => r.createdAt.slice(0, 10) === today);
  const already = closes.some((d) => d.date === today);

  const summary = useMemo(() => {
    const gross = todays.reduce((a, s) => a + s.totalRevenue, 0);
    const paid = todays.reduce((a, s) => a + s.amountPaid, 0);
    const credit = todays.reduce(
      (a, s) => a + Math.max(0, s.totalRevenue - s.amountPaid),
      0,
    );
    const ret = retToday.reduce((a, r) => a + r.total, 0);
    return { gross, paid, credit, ret, count: todays.length };
  }, [todays, retToday]);

  const [cash, setCash] = useState(String(summary.paid));
  const [upi, setUpi] = useState("0");
  const [note, setNote] = useState("");

  const save = () => {
    const res = closeDay({
      cash: Number(cash) || 0,
      upi: Number(upi) || 0,
      note,
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t("day.done"));
  };

  return (
    <AppShell title={t("day.title")} subtitle={t("day.sub")}>
      <RoleGate need="close_day">
      <div className="space-y-3.5 fade-in">
        <PageGuide text={t("guide.day")} />
        <Card className="border-0">
          <CardContent className="space-y-2 py-4">
            <Row label={t("day.bills")} value={String(summary.count)} />
            <Row label={t("home.sales")} value={formatINR(summary.gross)} />
            <Row label={t("pay.received")} value={formatINR(summary.paid)} />
            <Row label={t("pay.ledger")} value={formatINR(summary.credit)} />
            <Row label={t("ret.title")} value={formatINR(summary.ret)} />
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardContent className="space-y-3 py-4">
            <div className="grid gap-1.5">
              <Label>{t("day.cash")}</Label>
              <Input
                type="number"
                value={cash}
                onChange={(e) => setCash(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("day.upi")}</Label>
              <Input
                type="number"
                value={upi}
                onChange={(e) => setUpi(e.target.value)}
              />
            </div>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("common.optional")}
            />
            <Button className="w-full" onClick={save} disabled={already}>
              {already ? t("day.already") : t("day.close")}
            </Button>
            <Link to="/ca">
              <Button variant="secondary" className="w-full">
                {t("ca.monthClose")}
              </Button>
            </Link>
          </CardContent>
        </Card>

        {closes.length > 0 ? (
          <ul className="space-y-2">
            {closes.slice(0, 8).map((d) => (
              <li key={d.id}>
                <Card className="border-0">
                  <CardContent className="flex justify-between py-3 text-sm">
                    <span>{formatDate(d.date)}</span>
                    <span className="tabular font-semibold">
                      {formatINR(d.gross)}
                    </span>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      </RoleGate>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium tabular text-fg">{value}</span>
    </div>
  );
}
