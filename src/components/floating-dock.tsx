import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Barcode, Camera, ImagePlus, LayoutGrid, ListTodo } from "lucide-react";
import { toast } from "sonner";
import { cn, canSell } from "@/lib/utils";
import { DOCK_ITEMS, isActivePath, isMorePath } from "@/lib/nav";
import { NavIcon } from "@/components/nav-icons";
import { useActiveProfile } from "@/lib/store";
import { useT } from "@/lib/i18n-context";

export function FloatingDock({
  onMore,
  moreOpen = false,
}: {
  onMore: () => void;
  moreOpen?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const profile = useActiveProfile();
  const { t } = useT();
  const [sellOpen, setSellOpen] = useState(false);

  const goSell = (mode: "bill" | "product" | "barcode" | "list") => {
    if (!profile || !canSell(profile.roles)) {
      toast.error("Need a role to sell");
      return;
    }
    setSellOpen(false);
    void navigate({ to: "/sell", search: { mode } });
  };

  const moreActive = moreOpen || isMorePath(pathname);

  return (
    <>
      {sellOpen ? (
        <button
          type="button"
          className="absolute inset-0 z-40 bg-bg/50 no-print"
          aria-label="Close sell"
          onClick={() => setSellOpen(false)}
        />
      ) : null}

      <div className="floating-dock no-print">
        <div className="w-full">
          {sellOpen ? (
            <div className="mb-2 grid grid-cols-2 gap-1.5 fade-in">
              <SellChip
                icon={Camera}
                label={t("sell.bill")}
                onClick={() => goSell("bill")}
              />
              <SellChip
                icon={ImagePlus}
                label={t("sell.product")}
                onClick={() => goSell("product")}
              />
              <SellChip
                icon={Barcode}
                label={t("sell.barcode")}
                onClick={() => goSell("barcode")}
              />
              <SellChip
                icon={ListTodo}
                label={t("sell.list")}
                onClick={() => goSell("list")}
              />
            </div>
          ) : null}

          <nav className="dock-bar" aria-label="Main dock">
            {DOCK_ITEMS.map((item) => {
              const isSell = item.icon === "sell";
              const active = isSell
                ? sellOpen || isActivePath(pathname, "/sell")
                : isActivePath(pathname, item.to);

              if (isSell) {
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSellOpen((v) => !v)}
                    className={cn("dock-item", active && "dock-item-active")}
                    aria-label={t("sell.title")}
                    aria-current={active ? "page" : undefined}
                    aria-expanded={sellOpen}
                  >
                    <NavIcon
                      name="sell"
                      className="size-[1.15rem]"
                      active={active}
                    />
                    <span className="dock-label">{t(item.key)}</span>
                  </button>
                );
              }

              return (
                <Link
                  key={item.key}
                  to={item.to}
                  search={item.search}
                  onClick={() => setSellOpen(false)}
                  className={cn("dock-item", active && "dock-item-active")}
                  aria-current={active ? "page" : undefined}
                >
                  <NavIcon
                    name={item.icon}
                    className="size-[1.15rem]"
                    active={active}
                  />
                  <span className="dock-label">{t(item.key)}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setSellOpen(false);
                onMore();
              }}
              className={cn("dock-item", moreActive && "dock-item-active")}
              aria-label={t("nav.more")}
              aria-current={moreActive ? "page" : undefined}
            >
              <LayoutGrid
                className="size-[1.15rem]"
                strokeWidth={moreActive ? 2.35 : 1.85}
              />
              <span className="dock-label">{t("nav.more")}</span>
            </button>
          </nav>
        </div>
      </div>
    </>
  );
}

function SellChip({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-12 items-center gap-2 rounded-[var(--radius-lg)] bg-surface px-3 text-left text-sm font-semibold text-fg shadow-[var(--shadow-card)] ring-1 ring-border/80"
    >
      <Icon className="size-4 text-primary" />
      {label}
    </button>
  );
}
