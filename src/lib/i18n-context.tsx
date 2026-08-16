import { createContext, useContext, useEffect, useMemo } from "react";
import { useStockStore } from "@/lib/store";
import { t as translate, type Locale, isRtl } from "@/lib/i18n";
import type { AppLocale } from "@/lib/types";

type I18nCtx = {
  locale: Locale;
  t: (key: string, vars?: Record<string, string | number>) => string;
  rtl: boolean;
};

const Ctx = createContext<I18nCtx>({
  locale: "en",
  t: (k, v) => translate("en", k, v),
  rtl: false,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useStockStore((s) => s.locale) as AppLocale;
  const rtl = isRtl(locale as Locale);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale;
    document.documentElement.dir = rtl ? "rtl" : "ltr";
  }, [locale, rtl]);

  const value = useMemo<I18nCtx>(
    () => ({
      locale: locale as Locale,
      t: (key, vars) => translate(locale as Locale, key, vars),
      rtl,
    }),
    [locale, rtl],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useT() {
  return useContext(Ctx);
}
