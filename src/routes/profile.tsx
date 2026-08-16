import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Check, Plus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageGuide } from "@/components/page-guide";
import { PaySetupCard } from "@/components/pay-setup";
import { RoleChipBar, RoleExplain } from "@/components/role-lock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActiveProfile, useStockStore } from "@/lib/store";
import type { AppLocale, UserRole } from "@/lib/types";
import { LOCALES } from "@/lib/i18n";
import { useT } from "@/lib/i18n-context";
import { cn, roleLabel, rolesLabel } from "@/lib/utils";
import { ROLE_PERMS, PERM_LABEL } from "@/lib/rbac";
import { addedTotal } from "@/lib/shop-migrate";
import type { GstScheme, ShopKind } from "@/lib/types";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

const ROLE_OPTIONS: UserRole[] = [
  "owner",
  "salesman",
  "accountant",
  "hr",
  "maker",
  "checker",
];

function ProfilePage() {
  const { t } = useT();
  const profiles = useStockStore((s) => s.profiles);
  const active = useActiveProfile();
  const setActiveProfile = useStockStore((s) => s.setActiveProfile);
  const addProfile = useStockStore((s) => s.addProfile);
  const updateProfile = useStockStore((s) => s.updateProfile);
  const upgradeFromGuest = useStockStore((s) => s.upgradeFromGuest);
  const syncDemoData = useStockStore((s) => s.syncDemoData);
  const theme = useStockStore((s) => s.theme);
  const setTheme = useStockStore((s) => s.setTheme);
  const locale = useStockStore((s) => s.locale);
  const setLocale = useStockStore((s) => s.setLocale);
  const customers = useStockStore((s) => s.customers);
  const sales = useStockStore((s) => s.sales);
  const voiceHints = useStockStore((s) => s.voiceHints);
  const setVoiceHints = useStockStore((s) => s.setVoiceHints);
  const settings = useStockStore((s) => s.settings);
  const updateSettings = useStockStore((s) => s.updateSettings);

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [roles, setRoles] = useState<UserRole[]>(["maker"]);
  const [editRoles, setEditRoles] = useState<UserRole[]>(active?.roles ?? []);

  const toggle = (
    list: UserRole[],
    setList: (r: UserRole[]) => void,
    role: UserRole,
  ) => {
    setList(
      list.includes(role) ? list.filter((r) => r !== role) : [...list, role],
    );
  };

  const saveActiveRoles = () => {
    if (!active) return;
    if (editRoles.length === 0) {
      toast.error(t("on.needRole"));
      return;
    }
    updateProfile(active.id, { roles: [...editRoles] });
    toast.success(t("common.save"));
  };

  const create = () => {
    if (!name.trim()) {
      toast.error(t("on.needName"));
      return;
    }
    if (roles.length === 0) {
      toast.error(t("on.needRole"));
      return;
    }
    const id = addProfile({
      name,
      shopName: shopName || undefined,
      phone: phone || undefined,
      roles: [...roles],
    });
    setActiveProfile(id);
    setName("");
    setShopName("");
    setPhone("");
    setRoles(["maker"]);
    setShowAdd(false);
    toast.success(t("on.ready"));
  };

  return (
    <AppShell title={t("profile.title")}>
      <div className="space-y-4 fade-in">
        <PageGuide text={t("guide.profile")} />
        <RoleChipBar />
        {active?.isGuest ? (
          <Card className="border-warning/30 bg-warning/5" data-testid="create-profile-card">
            <CardContent className="space-y-3 py-4">
              <p className="text-sm font-semibold text-fg">{t("welcome.title")}</p>
              <p className="text-xs leading-relaxed text-muted">
                {t("profile.guestMode")} · {t("on.guestHint")}
              </p>
              <div className="grid gap-1.5">
                <Label>{t("on.name")}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("welcome.namePh")} />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("on.shop")}</Label>
                <Input value={shopName} onChange={(e) => setShopName(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("on.phone")}</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  if (!name.trim()) {
                    toast.error(t("on.needName"));
                    return;
                  }
                  upgradeFromGuest({
                    name,
                    shopName: shopName || undefined,
                    phone: phone || undefined,
                    roles: roles.length ? roles : ["maker", "checker", "accountant"],
                  });
                  setName("");
                  setShopName("");
                  setPhone("");
                  toast.success(t("on.ready"));
                }}
              >
                {t("welcome.save")}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <PaySetupCard />

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">{t("common.language")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
              {LOCALES.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLocale(l.id as AppLocale)}
                  className={cn(
                    "rounded-[var(--radius-md)] border px-1.5 py-2 text-center text-[10px] font-medium",
                    locale === l.id
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted",
                  )}
                >
                  {l.native}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("common.theme")}</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button
              type="button"
              variant={theme === "dark" ? "default" : "secondary"}
              className="flex-1"
              onClick={() => setTheme("dark")}
            >
              {t("common.dark")}
            </Button>
            <Button
              type="button"
              variant={theme === "light" ? "default" : "secondary"}
              className="flex-1"
              onClick={() => setTheme("light")}
            >
              {t("common.light")}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardContent className="space-y-3 py-4">
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={voiceHints}
                onChange={(e) => setVoiceHints(e.target.checked)}
                className="size-5"
              />
              {t("voice.on")}
            </label>
            <Link to="/whatsapp">
              <Button variant="secondary" className="w-full">
                {t("wa.title")}
              </Button>
            </Link>
            <Link to="/tools">
              <Button variant="outline" className="w-full">
                {t("tools.title")}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("shop.kindTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-[12px] text-muted">{t("shop.kindHint")}</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  ["kirana", t("shop.kirana")],
                  ["pharmacy", t("shop.pharmacy")],
                  ["general", t("shop.general")],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => updateSettings({ shopKind: id as ShopKind })}
                  className={cn(
                    "min-h-11 rounded-[var(--radius-md)] border px-1 text-[11px] font-semibold",
                    settings.shopKind === id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[12px] font-medium text-fg">{t("ca.scheme")}</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  ["regular", t("ca.regular")],
                  ["composition", t("ca.comp")],
                  ["unregistered", t("ca.unreg")],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => updateSettings({ gstScheme: id as GstScheme })}
                  className={cn(
                    "min-h-11 rounded-[var(--radius-md)] border px-1 text-[11px] font-semibold",
                    settings.gstScheme === id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted">{t("profile.team")}</h2>
          {profiles.map((p) => {
            const isActive = p.id === active?.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setActiveProfile(p.id);
                  setEditRoles([...p.roles]);
                  toast.message(p.name);
                }}
                className={cn(
                  "w-full rounded-[var(--radius-lg)] border p-3 text-left transition-colors",
                  isActive
                    ? "border-primary/40 bg-primary/10"
                    : "border-border bg-surface hover:bg-elevated",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-elevated text-muted">
                      <UserRound className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-fg">
                        {p.name}
                        {p.isGuest ? ` (${t("common.guest")})` : ""}
                      </p>
                      <p className="text-xs text-muted">
                        {rolesLabel(p.roles)}
                      </p>
                    </div>
                  </div>
                  {isActive ? (
                    <Badge variant="default">{t("profile.active")}</Badge>
                  ) : null}
                </div>
              </button>
            );
          })}
        </section>

        {active ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {t("on.roles")} · {active.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ROLE_OPTIONS.map((id) => {
                const on = editRoles.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggle(editRoles, setEditRoles, id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2.5 text-left",
                      on
                        ? "border-primary/40 bg-primary/10"
                        : "border-border bg-elevated",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded border",
                        on
                          ? "border-primary bg-primary text-primary-fg"
                          : "border-border-strong",
                      )}
                    >
                      {on ? <Check className="size-3" strokeWidth={3} /> : null}
                    </span>
                    <span className="text-sm font-medium text-fg">
                      {roleLabel(id)}
                    </span>
                  </button>
                );
              })}
              <Button type="button" className="w-full" onClick={saveActiveRoles}>
                {t("common.save")}
              </Button>
              <RoleExplain roles={editRoles} />
              <ul className="flex flex-wrap gap-1.5">
                {editRoles.flatMap((r) => [...ROLE_PERMS[r]]).filter((p, i, a) => a.indexOf(p) === i).map((p) => (
                  <li
                    key={p}
                    className="rounded-full bg-elevated px-2 py-0.5 text-[10px] font-medium text-muted"
                  >
                    {PERM_LABEL[p]}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted">
                {
                  sales.filter((s) => s.soldByProfileId === active.id).length
                }{" "}
                {t("bills.sales").toLowerCase()}
              </p>
            </CardContent>
          </Card>
        ) : null}

        {showAdd ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("profile.add")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-1.5">
                <Label>{t("on.name")}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("on.shop")}</Label>
                <Input
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("on.phone")}</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              {ROLE_OPTIONS.map((id) => {
                const on = roles.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggle(roles, setRoles, id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-left text-sm",
                      on ? "border-primary/40 bg-primary/10" : "border-border",
                    )}
                  >
                    {on ? <Check className="size-4 text-primary" /> : null}
                    {roleLabel(id)}
                  </button>
                );
              })}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAdd(false)}
                >
                  {t("common.cancel")}
                </Button>
                <Button type="button" onClick={create}>
                  {t("common.save")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="size-4" />
            {t("profile.add")}
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full"
          data-testid="profile-demo-sync"
          onClick={() => {
            const added = syncDemoData();
            const n = addedTotal(added);
            toast.success(n ? t("demo.filled", { n }) : t("demo.already"));
          }}
        >
          {t("demo.load")}
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {t("profile.customers")} ({customers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {customers.slice(0, 8).map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between border-b border-border py-2 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-fg">{c.name}</p>
                  <p className="text-xs text-muted">
                    {c.customerNo}
                    {c.whatsapp ? ` · ${c.whatsapp}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
