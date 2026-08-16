import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Barcode,
  Camera,
  ImagePlus,
  LayoutGrid,
  ListTodo,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn, canSell } from "@/lib/utils";
import { useActiveProfile } from "@/lib/store";
import { useT } from "@/lib/i18n-context";
import { HelpTip } from "@/components/help-tip";

export function SellFab({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const profile = useActiveProfile();
  const { t } = useT();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const go = (mode: "bill" | "product" | "barcode" | "list") => {
    if (!profile || !canSell(profile.roles)) {
      toast.error("Need a role to sell");
      return;
    }
    setOpen(false);
    void navigate({ to: "/sell", search: { mode } });
  };

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close sell menu"
          className="fixed inset-0 z-40 bg-bg/55 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div className={cn("relative z-50", compact ? "" : "fixed bottom-20 right-3")}>
        {open ? (
          <div
            className={cn(
              "absolute bottom-[3.5rem] right-0 w-[min(18rem,calc(100vw-1.5rem))] space-y-2 fade-in",
              !compact && "bottom-16",
            )}
          >
            <div className="flex items-center justify-between rounded-[var(--radius-xl)] border border-border bg-surface px-3 py-2.5 shadow-[var(--shadow-card)]">
              <p className="text-sm font-semibold text-fg">{t("sell.title")}</p>
              <HelpTip tipKey="tip.sellFab" side="left" />
            </div>
            <MenuButton
              icon={Camera}
              label={t("sell.bill")}
              hint={t("sell.billHint")}
              onClick={() => go("bill")}
            />
            <MenuButton
              icon={ImagePlus}
              label={t("sell.product")}
              hint={t("sell.productHint")}
              onClick={() => go("product")}
            />
            <MenuButton
              icon={Barcode}
              label={t("sell.barcode")}
              hint={t("sell.barcodeHint")}
              onClick={() => go("barcode")}
            />
            <MenuButton
              icon={ListTodo}
              label={t("sell.list")}
              hint={t("sell.listHint")}
              onClick={() => go("list")}
            />
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-[1.15rem] shadow-[var(--shadow-nav)] transition-transform active:scale-95",
            open
              ? "bg-elevated text-fg ring-1 ring-border"
              : "bg-sell text-sell-fg",
          )}
          aria-expanded={open}
          aria-label={open ? "Close sell" : "Open sell"}
        >
          {open ? (
            <X className="size-6" strokeWidth={2.2} />
          ) : (
            <LayoutGrid className="size-6" strokeWidth={2.2} />
          )}
        </button>
      </div>
    </>
  );
}

function MenuButton({
  icon: Icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 w-full items-center gap-3 rounded-[var(--radius-xl)] border border-border bg-surface px-3 py-3 text-left shadow-[var(--shadow-card)] transition-colors hover:bg-elevated active:scale-[0.99]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.9rem] bg-primary/12 text-primary">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-fg">
          {label}
        </span>
        <span className="block truncate text-xs text-muted">{hint}</span>
      </span>
    </button>
  );
}
