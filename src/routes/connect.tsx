import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStockStore } from "@/lib/store";
import { runCopilot } from "@/lib/copilot";
import {
  fetchIndiaHolidays,
  fetchUsdInr,
  fetchWeather,
  festivalTemplate,
  lookupBarcode,
  lookupPincode,
  nextHoliday,
  type FxQuote,
  type Holiday,
  type OffProduct,
  type PincodePlace,
  type WeatherNow,
} from "@/lib/public-apis";
import { formatINR } from "@/lib/utils";
import { useT } from "@/lib/i18n-context";

export const Route = createFileRoute("/connect")({
  component: ConnectPage,
});

function ConnectPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const addCatalogProduct = useStockStore((s) => s.addCatalogProduct);
  const upsertTemplate = useStockStore((s) => s.upsertTemplate);
  const updateShop = useStockStore((s) => s.updateShop);
  const shop = useStockStore((s) => s.shop);

  const [barcode, setBarcode] = useState("8901030865123");
  const [off, setOff] = useState<OffProduct | null>(null);
  const [pin, setPin] = useState("324001");
  const [place, setPlace] = useState<PincodePlace | null>(null);
  const [wx, setWx] = useState<WeatherNow | null>(null);
  const [fx, setFx] = useState<FxQuote | null>(null);
  const [usd, setUsd] = useState("10");
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [ask, setAsk] = useState("kitna Maggi");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void fetchWeather()
      .then(setWx)
      .catch(() => {});
    void fetchUsdInr()
      .then(setFx)
      .catch(() => {});
    void fetchIndiaHolidays()
      .then(setHolidays)
      .catch(() => {});
  }, []);

  const upcoming = nextHoliday(holidays);

  const scanOff = async () => {
    setBusy("off");
    try {
      const p = await lookupBarcode(barcode);
      setOff(p);
      if (!p) toast.error(t("api.offMiss"));
    } catch {
      toast.error(t("api.net"));
    } finally {
      setBusy(null);
    }
  };

  const saveOff = () => {
    if (!off) return;
    addCatalogProduct({
      name: off.brand ? `${off.brand} ${off.name}` : off.name,
      barcode: off.barcode,
      code: off.barcode,
      unitPrice: 0,
      quantity: 0,
    });
    toast.success(t("api.offSaved"));
  };

  const findPin = async () => {
    setBusy("pin");
    try {
      const p = await lookupPincode(pin);
      setPlace(p);
      if (!p) toast.error(t("api.pinMiss"));
    } catch {
      toast.error(t("api.net"));
    } finally {
      setBusy(null);
    }
  };

  const askCopilot = () => {
    const r = runCopilot(ask, useStockStore.getState());
    setReply(r.text);
    if (r.sell) {
      void navigate({
        to: "/sell",
        search: { mode: "product" },
      });
    }
  };

  return (
    <AppShell title={t("api.title")} subtitle={t("api.sub")} tipKey="tip.connect">
      <div className="space-y-3.5 fade-in">
        <Card className="border-0">
          <CardHeader>
            <CardTitle>{t("api.copilot")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted">{t("api.copilotHint")}</p>
            <Input
              value={ask}
              onChange={(e) => setAsk(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") askCopilot();
              }}
              placeholder="kitna Maggi"
            />
            <Button className="w-full" onClick={askCopilot}>
              {t("api.ask")}
            </Button>
            {reply ? (
              <pre className="whitespace-pre-wrap rounded-[var(--radius-md)] bg-elevated p-3 text-sm text-fg">
                {reply}
              </pre>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <Card className="border-0">
            <CardContent className="py-3">
              <p className="text-[11px] text-muted">{t("api.weather")}</p>
              <p className="text-lg font-bold tabular">
                {wx ? `${wx.tempC}° · ${wx.label}` : "…"}
              </p>
              <p className="text-[11px] leading-snug text-muted">
                {wx?.hint || t("api.loading")}
              </p>
            </CardContent>
          </Card>
          <Card className="border-0">
            <CardContent className="py-3">
              <p className="text-[11px] text-muted">{t("api.fx")}</p>
              <p className="text-lg font-bold tabular">
                {fx ? `₹${fx.rate.toFixed(2)}` : "…"}
              </p>
              <p className="text-[11px] text-muted">1 USD</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0">
          <CardHeader>
            <CardTitle>{t("api.off")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted">{t("api.offHint")}</p>
            <Input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="8901030865123"
              inputMode="numeric"
            />
            <Button
              className="w-full"
              variant="secondary"
              disabled={busy === "off"}
              onClick={() => void scanOff()}
            >
              {busy === "off" ? t("loading") : t("api.lookup")}
            </Button>
            {off ? (
              <div className="flex gap-3 rounded-[var(--radius-md)] bg-elevated p-2">
                {off.image ? (
                  <img
                    src={off.image}
                    alt=""
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{off.name}</p>
                  <p className="text-[11px] text-muted">
                    {off.brand} {off.quantity}
                  </p>
                  <Button size="sm" className="mt-1" onClick={saveOff}>
                    {t("api.addStock")}
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardHeader>
            <CardTitle>{t("api.pin")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
              />
              <Button
                variant="secondary"
                disabled={busy === "pin"}
                onClick={() => void findPin()}
              >
                {t("api.lookup")}
              </Button>
            </div>
            {place ? (
              <div className="space-y-2">
                <p className="text-sm">
                  {place.name}, {place.district}, {place.state}
                </p>
                <Button
                  className="w-full"
                  onClick={() => {
                    updateShop({
                      city: `${place.district}, ${place.state}`,
                      address: shop.address || place.name,
                    });
                    toast.success(t("shop.copied"));
                  }}
                >
                  {t("api.usePin")}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardHeader>
            <CardTitle>{t("api.holidays")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming ? (
              <p className="text-sm">
                {t("api.nextFest")}: <strong>{upcoming.localName}</strong> ·{" "}
                {upcoming.date}
              </p>
            ) : (
              <p className="text-sm text-muted">{t("api.loading")}</p>
            )}
            <ul className="space-y-1 text-xs text-muted">
              {holidays.slice(0, 6).map((h) => (
                <li key={h.date}>
                  {h.date} · {h.localName}
                </li>
              ))}
            </ul>
            {upcoming ? (
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => {
                  upsertTemplate({
                    name: `${upcoming.localName} offer`,
                    body: festivalTemplate(upcoming, shop.name),
                  });
                  toast.success(t("api.festSaved"));
                }}
              >
                {t("api.festTpl")}
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardHeader>
            <CardTitle>{t("api.importCost")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label>USD</Label>
            <Input
              value={usd}
              onChange={(e) => setUsd(e.target.value)}
              inputMode="decimal"
            />
            <p className="text-lg font-semibold tabular">
              {fx
                ? formatINR((Number(usd) || 0) * fx.rate)
                : t("api.loading")}
            </p>
          </CardContent>
        </Card>

        <p className="px-1 text-[11px] leading-relaxed text-subtle">
          {t("api.sources")}
        </p>
      </div>
    </AppShell>
  );
}
