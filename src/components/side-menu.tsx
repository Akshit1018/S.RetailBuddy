import { useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  CalendarCheck,
  Camera,
  ClipboardList,
  Database,
  Inbox,
  Lock,
  Moon,
  Store,
  Sun,
  Truck,
  Undo2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { cn, rolesLabel } from "@/lib/utils";
import { canAccessPath } from "@/lib/rbac";
import { useActiveProfile, useStockStore } from "@/lib/store";
import { effectiveStaffPerms } from "@/lib/staff";
import { useT } from "@/lib/i18n-context";

type MenuItem = {
  to: string;
  search?: Record<string, string>;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  match?: (p: string) => boolean;
};

export function SideMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const profile = useActiveProfile();
  const staffPerms = effectiveStaffPerms(profile);
  const theme = useStockStore((s) => s.theme);
  const toggleTheme = useStockStore((s) => s.toggleTheme);
  const { t } = useT();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const go = () => onClose();

  const sections: { label: string; items: MenuItem[] }[] = [
    {
      label: t("menu.sectionMain"),
      items: [
        {
          to: "/stock-in",
          icon: Camera,
          title: t("menu.stockIn"),
          match: (p) => p.startsWith("/stock-in"),
        },
        {
          to: "/review",
          icon: ClipboardList,
          title: t("menu.review"),
          match: (p) => p.startsWith("/review"),
        },
        {
          to: "/returns",
          icon: Undo2,
          title: t("menu.returns"),
          match: (p) => p.startsWith("/returns"),
        },
        {
          to: "/suppliers",
          icon: Truck,
          title: t("menu.suppliers"),
          match: (p) => p.startsWith("/suppliers"),
        },
      ],
    },
    {
      label: t("menu.sectionOps"),
      items: [
        {
          to: "/close-day",
          icon: CalendarCheck,
          title: t("menu.day"),
          match: (p) => p.startsWith("/close-day"),
        },
        {
          to: "/ca",
          icon: BookOpen,
          title: t("menu.ca"),
          match: (p) => p.startsWith("/ca"),
        },
      ],
    },
    {
      label: t("menu.sectionPeople"),
      items: [
        {
          to: "/shop-edit",
          icon: Store,
          title: t("menu.shopFront"),
          match: (p) => p.startsWith("/shop"),
        },
        {
          to: "/orders",
          icon: Inbox,
          title: t("menu.orders"),
          match: (p) => p.startsWith("/orders"),
        },
        {
          to: "/crm",
          icon: Users,
          title: t("menu.crm"),
          match: (p) => p.startsWith("/crm"),
        },
      ],
    },
    {
      label: t("menu.sectionAccount"),
      items: [
        {
          to: "/staff",
          icon: Users,
          title: t("menu.staff"),
          match: (p) => p.startsWith("/staff"),
        },
        {
          to: "/profile",
          icon: UserRound,
          title: t("menu.profile"),
          match: (p) => p.startsWith("/profile"),
        },
        {
          to: "/tools",
          icon: Database,
          title: t("menu.tools"),
          match: (p) => p.startsWith("/tools"),
        },
        {
          to: "/help",
          icon: BookOpen,
          title: t("menu.help"),
          match: (p) => p.startsWith("/help"),
        },
      ],
    },
  ];

  const initial = (profile?.name || "G").trim().charAt(0).toUpperCase();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] no-print">
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 bg-bg/65 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <aside
        className="absolute inset-y-0 left-0 z-10 flex h-full w-[min(86vw,19.5rem)] flex-col border-r border-border bg-surface shadow-[0_0_40px_-8px_rgb(0_0_0_/_0.55)] fade-in"
        style={{ paddingTop: "var(--grok-banner-h, 0px)" }}
        role="dialog"
        aria-modal="true"
        aria-label={t("menu.drawer")}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-fg">
              {t("menu.drawer")}
            </p>
            <p className="truncate text-[11px] text-muted">
              {t("guide.help")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-border bg-elevated text-fg"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <Link
          to="/profile"
          onClick={go}
          className="mx-3 mt-3 flex shrink-0 items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-elevated/70 px-3 py-2.5 transition-colors hover:bg-elevated"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
            {initial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-fg">
              {profile?.name || t("common.guest")}
            </span>
            <span className="block truncate text-[11px] text-muted">
              {profile?.shopName
                ? profile.shopName
                : rolesLabel(profile?.roles ?? [])}
            </span>
          </span>
        </Link>

        <nav className="app-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 py-3">
          {sections.map((sec) => (
            <div key={sec.label} className="mb-3">
              <p className="mb-1 px-3 text-[11px] font-semibold text-subtle">
                {sec.label}
              </p>
              <ul className="space-y-0.5">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const active = item.match
                    ? item.match(pathname)
                    : pathname === item.to;
                  const locked = !canAccessPath(
                    profile?.roles ?? [],
                    item.to,
                    staffPerms,
                  );
                  return (
                    <li key={`${item.to}-${item.title}`}>
                      <Link
                        to={item.to}
                        search={item.search}
                        onClick={go}
                        className={cn(
                          "relative flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 transition-colors",
                          locked
                            ? "text-subtle"
                            : active
                              ? "bg-primary/12 text-primary"
                              : "text-fg hover:bg-elevated",
                        )}
                      >
                        <Icon
                          className="size-[1.1rem] shrink-0"
                          strokeWidth={active && !locked ? 2.25 : 1.75}
                        />
                        <span className="min-w-0 flex-1 text-sm font-medium leading-tight">
                          {item.title}
                        </span>
                        {locked ? (
                          <Lock className="size-3.5 shrink-0 text-subtle" />
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border p-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-[var(--radius-md)] border border-border bg-elevated px-3 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-muted-surface"
          >
            {theme === "dark" ? (
              <Sun className="size-4 text-primary" />
            ) : (
              <Moon className="size-4 text-primary" />
            )}
            {theme === "dark" ? t("common.light") : t("common.dark")}{" "}
            {t("common.theme")}
          </button>
        </div>
      </aside>
    </div>
  );
}
