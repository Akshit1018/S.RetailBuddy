import { useRef, useState } from "react";
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
  buildBackup,
  downloadJson,
  downloadText,
  productsToCsv,
} from "@/lib/backup";
import { hashPin, lockSession } from "@/lib/pin";
import { useT } from "@/lib/i18n-context";
import {
  buildB2bCsv,
  buildB2csCsv,
  buildHsnCsv,
  salesToGstrLines,
} from "@/lib/gstr1-export";
import { downloadText as downloadCsv } from "@/lib/gstr1-export";
import { addedTotal, MIGRATION_STEPS, SHOP_DATA_VERSION } from "@/lib/shop-migrate";
import { canEditSettings, canExportGst, formatDateTime } from "@/lib/utils";

export const Route = createFileRoute("/tools")({
  component: ToolsPage,
});

function ToolsPage() {
  const { t } = useT();
  const store = useStockStore();
  const profile = useActiveProfile();
  const csvRef = useRef<HTMLInputElement>(null);
  const bakRef = useRef<HTMLInputElement>(null);
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [showMig, setShowMig] = useState(false);
  const settings = store.settings;
  const period = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const roles = profile?.roles ?? [];

  const exportBak = () => {
    const payload = buildBackup(useStockStore.getState());
    downloadJson(
      `stockscan-backup-${new Date().toISOString().slice(0, 10)}.json`,
      payload,
    );
    toast.success(t("tools.exported"));
  };

  const exportCsv = () => {
    downloadText("stockscan-products.csv", productsToCsv(store.products), "text/csv");
    toast.success(t("tools.csvOut"));
  };

  const exportGstr = () => {
    if (!canExportGst(roles)) {
      toast.error(t("rbac.needFor", { job: t("gstr.title") }));
      return;
    }
    const monthSales = store.sales.filter((s) => s.createdAt.startsWith(period));
    const lines = salesToGstrLines(monthSales, settings.stateCode);
    downloadCsv(`gstr1-b2b-${period}.csv`, buildB2bCsv(lines));
    downloadCsv(`gstr1-b2cs-${period}.csv`, buildB2csCsv(lines));
    downloadCsv(`gstr1-hsn-${period}.csv`, buildHsnCsv(lines));
    toast.success(t("gstr.exported", { period }));
  };

  const onCsv = async (file?: File | null) => {
    if (!file) return;
    const text = await file.text();
    const res = store.importProductsCsv(text);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t("tools.csvIn", { added: res.added, updated: res.updated }));
  };

  const onBak = async (file?: File | null) => {
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      if (!json?.state) {
        toast.error(t("tools.bakBad"));
        return;
      }
      store.importBackupState(json.state);
      toast.success(t("tools.bakOk"));
    } catch {
      toast.error(t("tools.bakBad"));
    }
  };

  const savePin = async () => {
    if (pin.length < 4) {
      toast.error(t("pin.need"));
      return;
    }
    if (pin !== pin2) {
      toast.error(t("pin.mismatch"));
      return;
    }
    store.setStaffPinHash(await hashPin(pin));
    setPin("");
    setPin2("");
    toast.success(t("pin.set"));
  };

  const fillDemo = () => {
    const added = store.syncDemoData();
    const n = addedTotal(added);
    toast.success(n ? t("demo.filled", { n }) : t("demo.already"));
  };

  const wipeDemo = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      toast.message(t("demo.resetHint"));
      return;
    }
    store.resetDemo();
    store.ensureGuest();
    setConfirmReset(false);
    toast.success(t("demo.resetOk"));
  };

  return (
    <AppShell title={t("tools.title")} subtitle={t("tools.sub")}>
      <div className="space-y-3.5 fade-in">
        <PageGuide text={t("guide.tools")} />

        <Card className="border-0" data-testid="demo-panel">
          <CardHeader>
            <CardTitle>{t("demo.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs leading-relaxed text-muted">{t("demo.hint")}</p>
            <p className="text-[11px] text-subtle">
              {t("mig.version", { n: store.shopDataVersion || SHOP_DATA_VERSION })}
              {store.demoSyncedAt
                ? ` · ${t("demo.synced", { at: formatDateTime(store.demoSyncedAt) })}`
                : ""}
            </p>
            <Button
              className="h-12 w-full"
              onClick={fillDemo}
              data-testid="demo-sync-btn"
            >
              {t("demo.load")}
            </Button>
            <Button
              variant={confirmReset ? "danger" : "outline"}
              className="w-full"
              onClick={wipeDemo}
              data-testid="demo-reset-btn"
            >
              {confirmReset ? t("demo.resetConfirm") : t("demo.reset")}
            </Button>
          </CardContent>
        </Card>

        <button
          type="button"
          onClick={() => setShowMig((v) => !v)}
          className="flex w-full items-center justify-between rounded-[var(--radius-lg)] bg-surface px-3.5 py-3 text-left text-sm font-semibold text-fg shadow-[var(--shadow-card)]"
          data-testid="mig-panel"
        >
          {t("mig.advanced")}
          <span className="text-[11px] font-medium text-muted">
            {t("mig.version", { n: store.shopDataVersion || SHOP_DATA_VERSION })}
          </span>
        </button>
        {showMig ? (
          <Card className="border-0">
            <CardContent className="space-y-2 py-4">
              <p className="text-xs leading-relaxed text-muted">{t("mig.hint")}</p>
              <ol className="space-y-2">
                {MIGRATION_STEPS.map((step) => (
                  <li key={step.id} className="rounded-[var(--radius-md)] bg-elevated/60 px-3 py-2">
                    <p className="text-sm font-medium text-fg">{step.title}</p>
                    <p className="text-xs leading-relaxed text-muted">{step.detail}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ) : null}

        <RoleGate need="settings">
          <Card className="border-0">
            <CardHeader>
              <CardTitle>{t("set.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="block text-xs font-medium text-muted">
                {t("set.near")}
                <Input
                  type="number"
                  min={1}
                  className="mt-1"
                  value={settings.nearExpiryDays}
                  disabled={!canEditSettings(roles)}
                  onChange={(e) =>
                    store.updateSettings({
                      nearExpiryDays: Math.max(1, Number(e.target.value) || 30),
                    })
                  }
                />
              </label>
              <label className="block text-xs font-medium text-muted">
                {t("set.reorder")}
                <Input
                  type="number"
                  min={0}
                  className="mt-1"
                  value={settings.defaultReorderLevel}
                  onChange={(e) =>
                    store.updateSettings({
                      defaultReorderLevel: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                />
              </label>
              <label className="block text-xs font-medium text-muted">
                {t("set.overdue")}
                <Input
                  type="number"
                  min={0}
                  className="mt-1"
                  value={settings.overdueDays}
                  onChange={(e) =>
                    store.updateSettings({
                      overdueDays: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                />
              </label>
              <label className="flex min-h-11 items-center gap-3 text-sm text-fg">
                <input
                  type="checkbox"
                  checked={settings.enforceCreditLimit}
                  onChange={(e) =>
                    store.updateSettings({ enforceCreditLimit: e.target.checked })
                  }
                />
                {t("set.enforceCredit")}
              </label>
              <label className="block text-xs font-medium text-muted">
                {t("set.credit")}
                <Input
                  type="number"
                  min={0}
                  className="mt-1"
                  value={settings.defaultCreditLimit}
                  onChange={(e) =>
                    store.updateSettings({
                      defaultCreditLimit: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                />
              </label>
              <label className="block text-xs font-medium text-muted">
                {t("set.state")}
                <Input
                  className="mt-1"
                  maxLength={2}
                  value={settings.stateCode}
                  onChange={(e) =>
                    store.updateSettings({
                      stateCode: e.target.value.replace(/\D/g, "").slice(0, 2),
                    })
                  }
                />
              </label>
              <label className="flex min-h-11 items-center gap-3 text-sm text-fg">
                <input
                  type="checkbox"
                  checked={settings.offlineQueueEnabled}
                  onChange={(e) =>
                    store.updateSettings({
                      offlineQueueEnabled: e.target.checked,
                    })
                  }
                />
                {t("set.offline")}
              </label>
            </CardContent>
          </Card>
        </RoleGate>

        <Card className="border-0">
          <CardHeader>
            <CardTitle>{t("gstr.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted">{t("gstr.hint")}</p>
            {canExportGst(roles) ? (
              <Button className="h-12 w-full" onClick={exportGstr}>
                {t("gstr.export")} ({period})
              </Button>
            ) : (
              <RoleGate need="gstr">
                <span />
              </RoleGate>
            )}
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardHeader>
            <CardTitle>{t("tools.backup")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button className="w-full" onClick={exportBak}>
              {t("tools.export")}
            </Button>
            <input
              ref={bakRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => void onBak(e.target.files?.[0])}
            />
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => bakRef.current?.click()}
            >
              {t("tools.restore")}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardHeader>
            <CardTitle>{t("tools.csv")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <p className="text-xs text-muted">{t("tools.csvHint")}</p>
            <Button variant="secondary" className="w-full" onClick={exportCsv}>
              {t("tools.csvOut")}
            </Button>
            <input
              ref={csvRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => void onCsv(e.target.files?.[0])}
            />
            <Button className="w-full" onClick={() => csvRef.current?.click()}>
              {t("tools.csvInBtn")}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardHeader>
            <CardTitle>{t("pin.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label>{t("pin.new")}</Label>
            <Input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••"
            />
            <Input
              type="password"
              inputMode="numeric"
              value={pin2}
              onChange={(e) =>
                setPin2(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder={t("pin.again")}
            />
            <Button className="w-full" onClick={() => void savePin()}>
              {t("pin.save")}
            </Button>
            {store.staffPinHash ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  store.setStaffPinHash(null);
                  lockSession();
                  toast.success(t("pin.cleared"));
                }}
              >
                {t("pin.clear")}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
