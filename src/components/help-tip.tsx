import { useEffect, useId, useRef, useState } from "react";
import { Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-context";

/** Soft circular “i” info tip */
export function HelpTip({
  tipKey,
  text,
  className,
  side = "bottom",
}: {
  tipKey?: string;
  text?: string;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const body = text || (tipKey ? t(tipKey) : "");

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: Event) => {
      const target = e.target as Node | null;
      if (ref.current && target && !ref.current.contains(target)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onDoc, true);
      document.addEventListener("keydown", onKey);
    }, 10);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", onDoc, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!body) return null;

  return (
    <div ref={ref} className={cn("relative inline-flex shrink-0", className)}>
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-elevated text-muted ring-1 ring-border/80 transition-colors hover:bg-muted-surface hover:text-fg active:scale-95"
        aria-label="Info"
        aria-expanded={open}
        aria-controls={id}
        title={body}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <Info className="size-3.5" strokeWidth={2.25} />
      </button>
      {open ? (
        <div
          id={id}
          role="tooltip"
          className={cn(
            "absolute z-[60] w-[min(16rem,calc(100vw-2rem))] rounded-[var(--radius-lg)] border border-border bg-surface p-3 text-left text-xs leading-relaxed text-fg shadow-[var(--shadow-card)]",
            side === "bottom" &&
              "left-0 top-full mt-2 sm:left-1/2 sm:-translate-x-1/2",
            side === "top" &&
              "bottom-full left-0 mb-2 sm:left-1/2 sm:-translate-x-1/2",
            side === "left" && "right-full top-0 mr-2",
            side === "right" && "left-full top-0 ml-2",
          )}
        >
          <div className="mb-1 flex items-start justify-between gap-2">
            <p className="flex-1">{body}</p>
            <button
              type="button"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted hover:bg-elevated"
              onClick={() => setOpen(false)}
              aria-label="Close tip"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <button
            type="button"
            className="mt-1 min-h-8 text-xs font-semibold text-primary"
            onClick={() => setOpen(false)}
          >
            {t("tip.close")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
