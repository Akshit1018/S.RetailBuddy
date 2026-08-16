import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageGuide } from "@/components/page-guide";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStockStore } from "@/lib/store";
import { qrImageUrl, shopPageUrl } from "@/lib/shop-order";
import { fileToDataUrl } from "@/lib/ocr";
import { lookupPincode } from "@/lib/public-apis";
import { useT } from "@/lib/i18n-context";

export const Route = createFileRoute("/shop-edit")({
  component: ShopEditPage,
});

function ShopEditPage() {
  const { t } = useT();
  const shop = useStockStore((s) => s.shop);
  const updateShop = useStockStore((s) => s.updateShop);
  const logoRef = useRef<HTMLInputElement>(null);
  const [pin, setPin] = useState("");
  const url = typeof window !== "undefined" ? shopPageUrl() : "/shop";
  const qr = qrImageUrl(url);

  const set =
    (key: keyof typeof shop) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const v =
        e.target.type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : e.target.value;
      updateShop({ [key]: v } as never);
    };

  return (
    <AppShell title={t("shop.edit")} subtitle={t("shop.editSub")}>
      <div className="space-y-3.5 fade-in">
        <PageGuide text={t("guide.shop")} />
        <Card className="border-0">
          <CardContent className="space-y-3 py-4 text-center">
            <img
              src={qr}
              alt="Shop QR"
              className="mx-auto h-40 w-40 rounded-[var(--radius-lg)] bg-white p-2"
              crossOrigin="anonymous"
            />
            <p className="break-all text-xs text-muted">{url}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(url);
                    toast.success(t("shop.copied"));
                  } catch {
                    toast.message(url);
                  }
                }}
              >
                {t("shop.copy")}
              </Button>
              <Link to="/shop">
                <Button className="w-full">{t("shop.open")}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardHeader>
            <CardTitle>{t("shop.card")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <input
              ref={logoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                updateShop({ logoDataUrl: await fileToDataUrl(f) });
              }}
            />
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => logoRef.current?.click()}
            >
              {t("shop.logo")}
            </Button>
            <Label>{t("on.shop")}</Label>
            <Input value={shop.name} onChange={set("name")} />
            <Input
              value={shop.tagline}
              onChange={set("tagline")}
              placeholder={t("shop.tagline")}
            />
            <Input
              value={shop.address}
              onChange={set("address")}
              placeholder={t("shop.address")}
            />
            <Input
              value={shop.city}
              onChange={set("city")}
              placeholder={t("shop.city")}
            />
            <div className="flex gap-2">
              <Input
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="PIN 324001"
                inputMode="numeric"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  try {
                    const p = await lookupPincode(pin);
                    if (!p) {
                      toast.error("PIN not found");
                      return;
                    }
                    updateShop({
                      city: `${p.district}, ${p.state}`,
                      address: shop.address || p.name,
                    });
                    toast.success(`${p.district}, ${p.state}`);
                  } catch {
                    toast.error("PIN lookup failed");
                  }
                }}
              >
                PIN
              </Button>
            </div>
            <Input
              value={shop.hours}
              onChange={set("hours")}
              placeholder={t("shop.hours")}
            />
            <Input
              value={shop.whatsapp}
              onChange={set("whatsapp")}
              placeholder="WhatsApp"
              inputMode="tel"
            />
            <Input
              value={shop.gstin}
              onChange={set("gstin")}
              placeholder="GSTIN"
            />
            <textarea
              value={shop.about}
              onChange={set("about")}
              rows={3}
              className="w-full rounded-[var(--radius-md)] border border-border bg-elevated px-3 py-2 text-base"
              placeholder={t("shop.about")}
            />
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={shop.showPrices}
                onChange={(e) => updateShop({ showPrices: e.target.checked })}
                className="size-5"
              />
              {t("shop.showPrices")}
            </label>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
