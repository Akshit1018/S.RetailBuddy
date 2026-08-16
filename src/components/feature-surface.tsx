import { Link } from "@tanstack/react-router";
import {
  Camera,
  ClipboardCheck,
  Inbox,
  Store,
  Sunset,
  Users,
} from "lucide-react";
import { useT } from "@/lib/i18n-context";
import { useActiveProfile } from "@/lib/store";
import { canAccessPath } from "@/lib/rbac";
import { effectiveStaffPerms } from "@/lib/staff";
import { Lock } from "lucide-react";

type Tile = {
  to:
    | "/stock-in"
    | "/review"
    | "/orders"
    | "/shop-edit"
    | "/close-day"
    | "/staff";
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: string;
};

const TILES: Tile[] = [
  { to: "/stock-in", labelKey: "feat.in", icon: Camera },
  { to: "/review", labelKey: "feat.review", icon: ClipboardCheck, badgeKey: "review" },
  { to: "/orders", labelKey: "feat.orders", icon: Inbox, badgeKey: "orders" },
  { to: "/shop-edit", labelKey: "feat.shop", icon: Store },
  { to: "/close-day", labelKey: "feat.day", icon: Sunset },
  { to: "/staff", labelKey: "feat.staff", icon: Users },
];

export function FeatureSurface({
  badges,
}: {
  badges?: Partial<Record<string, number>>;
}) {
  const { t } = useT();
  const profile = useActiveProfile();
  const perms = effectiveStaffPerms(profile);
  return (
    <section aria-label={t("home.menu")} className="space-y-2">
      <div className="flex items-end justify-between px-0.5">
        <h2 className="text-[15px] font-semibold text-fg">{t("home.menu")}</h2>
        <Link to="/help" className="text-[12px] font-medium text-primary">
          {t("nav.help")}
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {TILES.map((tile) => {
          const n = tile.badgeKey ? badges?.[tile.badgeKey] : 0;
          const Icon = tile.icon;
          const locked = !canAccessPath(profile?.roles ?? [], tile.to, perms);
          return (
            <Link
              key={tile.to}
              to={tile.to}
              className="relative flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-[var(--radius-lg)] bg-surface px-2 py-2.5 text-center shadow-[var(--shadow-card)] transition-transform active:scale-[0.98]"
            >
              {n && n > 0 && !locked ? (
                <span className="absolute right-1.5 top-1.5 min-w-5 rounded-full bg-primary px-1 py-0.5 text-[10px] font-bold text-primary-fg">
                  {n}
                </span>
              ) : locked ? (
                <Lock className="absolute right-1.5 top-1.5 size-3 text-subtle" />
              ) : null}
              <Icon
                className={locked ? "size-5 text-subtle" : "size-5 text-primary"}
              />
              <span className="text-[12px] font-semibold leading-tight text-fg">
                {t(tile.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
