import { useEffect } from "react";
import { useStockStore } from "@/lib/store";
import { isRtl } from "@/lib/i18n";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useStockStore((s) => s.theme);
  const locale = useStockStore((s) => s.locale);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = locale || "en";
    document.documentElement.dir = isRtl(locale) ? "rtl" : "ltr";
  }, [locale]);

  return <>{children}</>;
}
