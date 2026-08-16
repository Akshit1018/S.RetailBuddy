import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useT } from "@/lib/i18n-context";

/** One calm sentence + optional How? steps. Replaces scattered (i) tips. */
export function PageGuide({
  text,
  steps,
}: {
  text: string;
  steps?: string[];
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const hasSteps = Boolean(steps?.length);

  return (
    <section className="rounded-[var(--radius-lg)] bg-surface px-3.5 py-3 shadow-[var(--shadow-card)]">
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-[13px] leading-snug text-muted">
          {text}
        </p>
        {hasSteps ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-full px-2 text-[12px] font-semibold text-primary"
            aria-expanded={open}
          >
            {t("guide.how")}
            {open ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>
        ) : null}
      </div>
      {open && steps?.length ? (
        <ol className="mt-2 space-y-1.5 border-t border-border pt-2">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-2 text-[13px] leading-snug text-fg">
              <span className="w-4 shrink-0 font-semibold tabular text-primary">
                {i + 1}.
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
