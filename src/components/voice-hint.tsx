import { useEffect } from "react";
import { useStockStore } from "@/lib/store";

export function speakHint(text: string, locale: string) {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = locale.startsWith("hi") ? "hi-IN" : locale;
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

/** Soft first-visit spoken hint */
export function VoiceHint({ text }: { text: string }) {
  const on = useStockStore((s) => s.voiceHints);
  const locale = useStockStore((s) => s.locale);

  useEffect(() => {
    if (!on || !text) return;
    const key = `voice:${text.slice(0, 40)}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      return;
    }
    const t = window.setTimeout(() => speakHint(text, locale), 600);
    return () => window.clearTimeout(t);
  }, [on, text, locale]);

  return null;
}
