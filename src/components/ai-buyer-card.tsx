import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Ban,
  ChevronRight,
  MapPin,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { analyzeShop, webPicksFor, type BuyAdvice } from "@/lib/ai-buyer";
import {
  fetchIndiaHolidays,
  fetchWeather,
  nextHoliday,
  type Holiday,
  type WeatherNow,
} from "@/lib/public-apis";
import { useStockStore } from "@/lib/store";
import { useT } from "@/lib/i18n-context";
import { cn } from "@/lib/utils";

const CITY_COORDS: Record<string, [number, number]> = {
  kota: [25.2138, 75.8648],
  jaipur: [26.9124, 75.7873],
  delhi: [28.6139, 77.209],
  mumbai: [19.076, 72.8777],
  pune: [18.5204, 73.8567],
  ahmedabad: [23.0225, 72.5714],
  lucknow: [26.8467, 80.9462],
  bengaluru: [12.9716, 77.5946],
  bangalore: [12.9716, 77.5946],
  hyderabad: [17.385, 78.4867],
  chennai: [13.0827, 80.2707],
  kolkata: [22.5726, 88.3639],
};

function coordsFor(city: string): [number, number] {
  const n = city.toLowerCase();
  const hit = Object.entries(CITY_COORDS).find(([k]) => n.includes(k));
  return hit?.[1] ?? [25.2138, 75.8648];
}

export function AiHeaderButton({
  open,
  onOpen,
}: {
  open: boolean;
  onOpen: () => void;
}) {
  const { t } = useT();
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-primary shadow-[var(--shadow-card)] ring-1 ring-border/70",
        open && "bg-primary/10 ring-primary/40",
      )}
      aria-label={t("ai.title")}
      data-testid="ai-header-btn"
    >
      <Sparkles className="size-4" strokeWidth={2.2} />
    </button>
  );
}

export function AiBuyerSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useT();
  const products = useStockStore((s) => s.products);
  const sales = useStockStore((s) => s.sales);
  const city = useStockStore((s) => s.shop.city) || "Jaipur";
  const addCatalogProduct = useStockStore((s) => s.addCatalogProduct);

  const [weather, setWeather] = useState<WeatherNow | null>(null);
  const [holiday, setHoliday] = useState<Holiday | null>(null);

  const report = useMemo(
    () => analyzeShop({ products, sales, city, weather, holiday }),
    [products, sales, city, weather, holiday],
  );

  useEffect(() => {
    if (!open) return;
    let live = true;
    const [lat, lon] = coordsFor(city);
    void Promise.allSettled([fetchWeather(lat, lon), fetchIndiaHolidays()]).then(
      ([w, h]) => {
        if (!live) return;
        if (w.status === "fulfilled") setWeather(w.value);
        if (h.status === "fulfilled") setHoliday(nextHoliday(h.value));
      },
    );
    return () => {
      live = false;
    };
  }, [open, city]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const webPicks = useMemo(() => webPicksFor(city).slice(0, 6), [city]);

  const addAdvice = (item: BuyAdvice) => {
    addCatalogProduct({
      name: item.name,
      code: item.code,
      barcode: item.barcode ?? undefined,
      quantity: 0,
    });
    toast.success(t("ai.added", { name: item.name }));
  };

  const addWeb = (p: (typeof webPicks)[number]) => {
    addCatalogProduct({
      name: `${p.brand} ${p.name}`,
      quantity: 0,
    });
    toast.success(t("ai.added", { name: p.name }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]" data-testid="ai-sheet">
      <button
        type="button"
        className="absolute inset-0 bg-fg/35 backdrop-blur-[2px]"
        aria-label={t("common.cancel")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-sheet-title"
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[88svh] w-full max-w-lg flex-col rounded-t-[1.75rem] bg-surface shadow-[var(--shadow-nav)] md:bottom-auto md:top-1/2 md:max-h-[80vh] md:-translate-y-1/2 md:rounded-[1.75rem]"
      >
        <div className="flex shrink-0 items-center gap-3 px-4 pb-2 pt-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-fg">
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p id="ai-sheet-title" className="text-[15px] font-semibold text-fg">
              {t("ai.title")}
            </p>
            <p className="flex items-center gap-1 text-[11px] font-medium text-muted">
              <MapPin className="size-3" />
              {city} · {report.pack.label}
              {weather ? ` · ${weather.tempC}° ${weather.label}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-elevated text-fg"
            aria-label={t("common.cancel")}
            data-testid="ai-sheet-close"
          >
            <X className="size-5" strokeWidth={2.2} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-1">
          <p className="rounded-[var(--radius-lg)] bg-elevated px-3 py-2 text-[12px] leading-snug text-fg">
            {report.summary}
          </p>

          {holiday ? (
            <p className="text-[11px] font-medium text-primary">
              {t("ai.holiday", { name: holiday.localName, date: holiday.date })}
            </p>
          ) : null}

          <AdviceBlock
            title={t("ai.buy")}
            empty={t("ai.buyEmpty")}
            icon={TrendingUp}
            tone="buy"
            items={report.buy}
            addLabel={t("ai.add")}
            onAdd={addAdvice}
          />
          <AdviceBlock
            title={t("ai.skip")}
            empty={t("ai.skipEmpty")}
            icon={Ban}
            tone="skip"
            items={report.skip}
          />
          <AdviceBlock
            title={t("ai.city", { city })}
            empty={t("ai.cityEmpty")}
            icon={TrendingDown}
            tone="city"
            items={report.city}
            addLabel={t("ai.add")}
            onAdd={addAdvice}
          />

          <div className="space-y-2">
            <p className="text-[12px] font-semibold text-fg">{t("ai.web")}</p>
            {webPicks.length === 0 ? (
              <p className="text-[11px] text-muted">{t("ai.webEmpty")}</p>
            ) : (
              <ul className="space-y-1.5">
                {webPicks.map((p) => (
                  <li
                    key={`${p.brand}-${p.name}`}
                    className="flex items-center gap-2 rounded-[var(--radius-lg)] bg-elevated px-2.5 py-2"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface text-[9px] font-bold leading-tight text-muted">
                      {p.brand.slice(0, 4).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-fg">
                        {p.brand} {p.name}
                      </p>
                      <p className="truncate text-[10px] text-muted">{p.why}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addWeb(p)}
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-fg"
                      aria-label={t("ai.add")}
                    >
                      <Plus className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link
            to="/shop-edit"
            onClick={onClose}
            className="flex min-h-11 items-center justify-between text-[12px] font-semibold text-primary"
          >
            {t("ai.changeCity")}
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function AdviceBlock({
  title,
  empty,
  icon: Icon,
  tone,
  items,
  addLabel,
  onAdd,
}: {
  title: string;
  empty: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "buy" | "skip" | "city";
  items: BuyAdvice[];
  addLabel?: string;
  onAdd?: (item: BuyAdvice) => void;
}) {
  const toneCls =
    tone === "buy"
      ? "text-success"
      : tone === "skip"
        ? "text-danger"
        : "text-primary";
  return (
    <div className="space-y-1.5">
      <p className={cn("flex items-center gap-1.5 text-[12px] font-semibold", toneCls)}>
        <Icon className="size-3.5" />
        {title}
      </p>
      {items.length === 0 ? (
        <p className="text-[11px] text-muted">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-2 rounded-[var(--radius-lg)] bg-elevated px-2.5 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-snug text-fg">
                  {item.name}
                  {item.qtyHint ? (
                    <span className="ml-1.5 text-[10px] font-medium text-muted">
                      {item.qtyHint}
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted">
                  {item.reason}
                </p>
              </div>
              {onAdd && !item.alreadyInShop ? (
                <button
                  type="button"
                  onClick={() => onAdd(item)}
                  className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-primary shadow-[var(--shadow-card)]"
                  aria-label={addLabel}
                >
                  <Plus className="size-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
