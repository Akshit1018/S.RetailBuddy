import { Link } from "@tanstack/react-router";
import { Lock, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useActiveProfile, useStockStore } from "@/lib/store";
import {
  PERM_LABEL,
  ROLE_BLURB,
  hasPermission,
  rolesForPermission,
  staffAllows,
  type Permission,
} from "@/lib/rbac";
import { effectiveStaffPerms } from "@/lib/staff";
import { useT } from "@/lib/i18n-context";
import { cn, roleLabel } from "@/lib/utils";

export function RoleGate({
  need,
  children,
}: {
  need: Permission | Permission[];
  children: React.ReactNode;
}) {
  const profile = useActiveProfile();
  const list = Array.isArray(need) ? need : [need];
  const perms = effectiveStaffPerms(profile);
  const ok = list.some(
    (p) => hasPermission(profile?.roles ?? [], p) && staffAllows(p, perms),
  );
  if (ok) return <>{children}</>;
  return <RoleLock need={list} />;
}

export function RoleLock({ need }: { need: Permission[] }) {
  const { t } = useT();
  const profiles = useStockStore((s) => s.profiles);
  const setActive = useStockStore((s) => s.setActiveProfile);
  const who = need
    .flatMap((p) => rolesForPermission(p))
    .filter((r, i, a) => a.indexOf(r) === i);
  const label = need.map((p) => PERM_LABEL[p]).join(" / ");
  const switchable = profiles.filter((p) =>
    need.some(
      (perm) => hasPermission(p.roles, perm) && staffAllows(perm, effectiveStaffPerms(p)),
    ),
  );

  return (
    <Card
      className="border-warning/30 bg-warning/5"
      data-testid="role-lock"
    >
      <CardContent className="space-y-3 py-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
            <Lock className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg">{t("rbac.locked")}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {t("rbac.needFor", { job: label })}
            </p>
            <p className="mt-1 text-xs text-muted">
              {who.map((r) => roleLabel(r)).join(" · ")}
            </p>
          </div>
        </div>
        {switchable.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-subtle">
              {t("rbac.switchTo")}
            </p>
            {switchable.map((p) => (
              <button
                key={p.id}
                type="button"
                data-testid={`switch-${p.id}`}
                onClick={() => {
                  setActive(p.id);
                  toast.message(`${p.name} · ${p.roles.map(roleLabel).join(", ")}`);
                }}
                className="flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface px-3 text-left"
              >
                <UserRound className="size-4 text-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-fg">
                    {p.name}
                    {p.isGuest ? ` (${t("common.guest")})` : ""}
                  </span>
                  <span className="block text-[11px] text-muted">
                    {p.roles.map(roleLabel).join(" · ")}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <Link to="/profile">
            <Button className="w-full">{t("rbac.openProfile")}</Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

export function RoleChipBar() {
  const { t } = useT();
  const profile = useActiveProfile();
  const profiles = useStockStore((s) => s.profiles);
  const setActive = useStockStore((s) => s.setActiveProfile);
  if (profiles.length < 2) return null;
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5" data-testid="role-chip-bar">
      {profiles.map((p) => {
        const on = p.id === profile?.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => setActive(p.id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-semibold",
              on
                ? "border-primary bg-primary text-primary-fg"
                : "border-border bg-surface text-muted",
            )}
          >
            {p.isGuest ? t("common.guest") : p.name}
          </button>
        );
      })}
    </div>
  );
}

export function RoleExplain({ roles }: { roles: import("@/lib/types").UserRole[] }) {
  if (!roles.length) return null;
  return (
    <ul className="space-y-1 text-xs leading-relaxed text-muted">
      {roles.map((r) => (
        <li key={r}>
          <span className="font-semibold text-fg">{roleLabel(r)}.</span>{" "}
          {ROLE_BLURB[r]}
        </li>
      ))}
    </ul>
  );
}
