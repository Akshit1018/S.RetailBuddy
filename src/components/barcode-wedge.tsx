import { useEffect, useRef } from "react";

/**
 * Hardware barcode scanners usually type very fast then send Enter.
 * Capture that burst even when no input is focused.
 */
export function useBarcodeWedge(onCode: (code: string) => void, enabled = true) {
  const buf = useRef("");
  const last = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) {
        return;
      }
      const now = Date.now();
      if (now - last.current > 80) buf.current = "";
      last.current = now;
      if (e.key === "Enter") {
        const code = buf.current.trim();
        buf.current = "";
        if (code.length >= 4) {
          e.preventDefault();
          onCode(code);
        }
        return;
      }
      if (e.key.length === 1) buf.current += e.key;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCode, enabled]);
}
