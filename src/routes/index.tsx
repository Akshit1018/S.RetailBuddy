import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  Camera,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { AppShell } from "@/components/app-shell";
import { PageGuide } from "@/components/page-guide";
import { HomeSearch } from "@/components/home-search";
import { ProductList } from "@/components/product-list";
import { StockBucketTabs } from "@/components/stock-bucket-tabs";
import { PaymentBadge } from "@/components/payment-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { bucketCounts, filterByBucket } from "@/lib/stock-buckets";
import { selectDashboard, useStockStore } from "@/lib/store";
import { toast } from "sonner";
import { addedTotal } from "@/lib/shop-migrate";
import type { StockBucket } from "@/lib/types";
import { formatDate, formatINR } from "@/lib/utils";
import { useT } from "@/lib/i18n-context";
import { FeatureSurface } from "@/components/feature-surface";
import { VoiceHint } from "@/components/voice-hint";
import { ExpiryPopup } from "@/components/expiry-popup";
import { isOnline, readQueue } from "@/lib/offline-queue";
import { remainingAmount } from "@/lib/payment";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { t } = useT();
  const products = useStockStore((s) => s.products);
  const invoices = useStockStore((s) => s.invoices);
  const sales = useStockStore((s) => s.sales);
  const shopOrders = useStockStore((s) => s.shopOrders);
  const settings = useStockStore((s) => s.settings);
  const syncDemoData = useStockStore((s) => s.syncDemoData);
  const stats = useStockStore(useShallow(selectDashboard));
  const [bucket, setBucket] = useState<StockBucket>("current");
  const [showMoney, setShowMoney] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  const counts = bucketCounts(products, settings);
  const filtered = filterByBucket(products, bucket, settings).slice(0, 3);
  const recentIn = invoices.filter((i) => i.kind === "stock_in").slice(0, 2);
  const recentSales = sales.slice(0, 2);

  return (
    <AppShell
      title={t("home.title")}
      subtitle={t("home.subtitle", {
        units: stats.totalUnits,
        skus: stats.skus,
      })}
    >
      <VoiceHint text={t("home.emptyHint")} />
      <div className="space-y-3.5 fade-in">
        <ExpiryPopup />
        <HomeSearch products={products} />
        <PageGuide
          text={t("guide.home")}
          steps={[t("guide.home1"), t("guide.home2"), t("guide.home3")]}
        />
        {sales.length === 0 ? (
          <Card className="border-warning/30 bg-warning/5" data-testid="home-demo-cta">
            <CardContent className="space-y-2 py-4">
              <p className="text-sm leading-relaxed text-muted">{t("demo.homeCta")}</p>
              <Button
                className="h-11 w-full"
                onClick={() => {
                  const added = syncDemoData();
                  toast.success(
                    addedTotal(added)
                      ? t("demo.filled", { n: addedTotal(added) })
                      : t("demo.already"),
                  );
                }}
              >
                {t("demo.load")}
              </Button>
            </CardContent>
          </Card>
        ) : null}
        <StatusStrips />
        <Card className="overflow-hidden border-0 bg-surface">
          <CardContent className="space-y-3 py-4">
            <div>
              <p className="text-xs font-medium text-muted">{t("home.today")}</p>
              <p className="mt-0.5 text-[1.85rem] font-bold tracking-tight tabular text-fg">
                {formatINR(stats.todayRev)}
              </p>
              <p className="text-[12px] text-muted">
                {stats.todayCount} · {t("home.gross")} {formatINR(stats.profit)}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MiniStat
                label={t("home.creditToday")}
                value={formatINR(stats.todayCredit)}
                warn={stats.todayCredit > 0}
              />
              <MiniStat
                label={t("home.expire7")}
                value={String(stats.expireSoon)}
                warn={stats.expireSoon > 0}
              />
              <MiniStat
                label={t("home.lowStock")}
                value={String(stats.low)}
                warn={stats.low > 0}
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-2 sm:hidden">
          <Link to="/stock-in">
            <Button size="default" className="h-12 w-full gap-2 shadow-sm">
              <Camera className="size-4" />
              {t("home.photoStock")}
            </Button>
          </Link>
          <Link to="/sell" search={{ mode: "product" }}>
            <Button size="default" variant="sell" className="h-12 w-full gap-2">
              <ShoppingBag className="size-4" />
              {t("sell.title")}
            </Button>
          </Link>
        </div>

        <FeatureSurface
          badges={{
            review: stats.pendingInvoices,
            orders: shopOrders.filter((o) => o.status === "new").length,
          }}
        />

        <Card className="border-0">
          <CardContent className="space-y-3 py-4">
            <h2 className="text-[15px] font-semibold text-fg">
              {t("home.sections")}
            </h2>
            <StockBucketTabs
              value={bucket}
              onChange={setBucket}
              counts={counts}
            />
            <ProductList
              products={filtered}
              emptyText={t("bucket.empty")}
              compact
            />
            <Link
              to="/stock"
              search={{ bucket }}
              className="flex items-center justify-center gap-1 py-1 text-sm font-semibold text-primary"
            >
              {t("home.openStock")}
              <ChevronRight className="size-4" />
            </Link>
          </CardContent>
        </Card>

        <section className="space-y-2">
          <button
            type="button"
            onClick={() => setShowMoney((v) => !v)}
            className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-xl)] border-0 bg-surface px-4 py-3.5 text-left shadow-[var(--shadow-card)]"
          >
            <span className="text-[15px] font-semibold text-fg">
              {t("home.pnl")}
            </span>
            {showMoney ? (
              <ChevronUp className="size-4 text-muted" />
            ) : (
              <ChevronDown className="size-4 text-muted" />
            )}
          </button>
          {showMoney ? (
            <div className="grid grid-cols-2 gap-2">
              <Stat
                label={t("home.purchase")}
                value={formatINR(stats.purchase)}
                icon={ArrowDownRight}
                tone="info"
              />
              <Stat
                label={t("home.sales")}
                value={formatINR(stats.salesRevenue)}
                icon={ArrowUpRight}
                tone="success"
              />
              <Stat
                label={t("home.gross")}
                value={formatINR(stats.profit)}
                icon={TrendingUp}
                tone={stats.profit >= 0 ? "success" : "danger"}
              />
              <Stat
                label={t("home.perPiece")}
                value={formatINR(stats.profitPerPiece)}
                icon={TrendingUp}
                tone="default"
              />
            </div>
          ) : null}
        </section>

        <section className="space-y-2 pb-2">
          <button
            type="button"
            onClick={() => setShowActivity((v) => !v)}
            className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-xl)] border-0 bg-surface px-4 py-3.5 text-left shadow-[var(--shadow-card)]"
          >
            <span className="text-[15px] font-semibold text-fg">
              {t("home.activity")}
            </span>
            {showActivity ? (
              <ChevronUp className="size-4 text-muted" />
            ) : (
              <ChevronDown className="size-4 text-muted" />
            )}
          </button>
          {showActivity ? (
            recentIn.length === 0 && recentSales.length === 0 ? (
              <div className="rounded-[var(--radius-xl)] border border-dashed border-border-strong bg-surface px-4 py-6 text-center text-sm text-muted">
                {t("home.emptyActivity")}
              </div>
            ) : (
              <div className="space-y-2">
                {recentIn.map((inv) => (
                  <Card key={inv.id} className="border-0">
                    <CardContent className="flex items-start justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-fg">
                          {inv.supplier || inv.invoiceNo || t("bills.purchases")}
                        </p>
                        <p className="text-[11px] text-muted">
                          {inv.createdByName || "—"} · {formatDate(inv.createdAt)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {recentSales.map((sale) => (
                  <Link
                    key={sale.id}
                    to="/bills/$saleId"
                    params={{ saleId: sale.id }}
                  >
                    <Card className="border-0 transition-colors hover:bg-elevated">
                      <CardContent className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-fg">
                            {sale.billNo}
                          </p>
                          <p className="text-[11px] text-muted">
                            {sale.soldByName || "—"} · {formatDate(sale.createdAt)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold tabular">
                            {formatINR(sale.totalRevenue)}
                          </p>
                          <PaymentBadge sale={sale} />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}

function StatusStrips() {
  const { t } = useT();
  const sales = useStockStore((s) => s.sales);
  const [offline, setOffline] = useState(!isOnline());
  const [queued, setQueued] = useState(0);

  useEffect(() => {
    const sync = () => {
      setOffline(!isOnline());
      setQueued(readQueue().length);
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  const openCredit = sales.reduce((a, s) => a + remainingAmount(s), 0);
  const dueBills = sales.filter((s) => remainingAmount(s) > 0).length;

  if (!offline && queued === 0 && openCredit <= 0) return null;

  return (
    <div className="space-y-2">
      {offline || queued > 0 ? (
        <Link
          to="/tools"
          className="flex min-h-11 items-center justify-between rounded-[var(--radius-lg)] bg-warning/12 px-3 py-2 text-[12px] font-semibold text-warning"
        >
          <span>
            {offline ? t("offline.chip") : t("offline.queued", { n: queued })}
          </span>
          <ChevronRight className="size-4" />
        </Link>
      ) : null}
      {openCredit > 0 ? (
        <Link
          to="/whatsapp"
          className="flex min-h-11 items-center justify-between rounded-[var(--radius-lg)] bg-danger/10 px-3 py-2 text-[12px] font-semibold text-danger"
        >
          <span>
            {t("home.dueStrip", { amount: formatINR(openCredit), n: dueBills })}
          </span>
          <ChevronRight className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}

function MiniStat({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-elevated px-2 py-2.5 text-center">
      <p
        className={`text-base font-bold tabular ${warn ? "text-warning" : "text-fg"}`}
      >
        {value}
      </p>
      <p className="truncate text-[10px] font-medium text-muted">{label}</p>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "default" | "success" | "danger" | "info";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "danger"
        ? "text-danger"
        : tone === "info"
          ? "text-info"
          : "text-primary";
  return (
    <Card className="border-0">
      <CardContent className="space-y-1 py-3">
        <div className="flex items-center gap-1.5 text-muted">
          <Icon className={`size-3.5 shrink-0 ${toneClass}`} />
          <span className="truncate text-[11px] font-medium">{label}</span>
        </div>
        <p className="truncate text-base font-bold tracking-tight tabular text-fg">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
