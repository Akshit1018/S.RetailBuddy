import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Copy, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageGuide } from "@/components/page-guide";
import { ImageCapture } from "@/components/image-capture";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActiveProfile, useStockStore } from "@/lib/store";
import { canManageTeam, HIRE_ROLES } from "@/lib/rbac";
import { attendanceFor, defaultStaffPerms, staffInitial, todayKey } from "@/lib/staff";
import type { UserRole } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";
import { useT } from "@/lib/i18n-context";

export const Route = createFileRoute("/staff/")({
  component: StaffPage,
});

function StaffPage() {
  const { t } = useT();
  const me = useActiveProfile();
  const profiles = useStockStore((s) => s.profiles);
  const shopCode = useStockStore((s) => s.shopCode);
  const ensureShopCode = useStockStore((s) => s.ensureShopCode);
  const shop = useStockStore((s) => s.shop);
  const hireStaff = useStockStore((s) => s.hireStaff);
  const canHire = canManageTeam(me?.roles ?? []);

  useEffect(() => {
    ensureShopCode();
  }, [ensureShopCode]);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [salary, setSalary] = useState("");
  const [role, setRole] = useState<UserRole>("salesman");
  const [avatar, setAvatar] = useState<string | null>(null);

  const staff = profiles.filter((p) => !p.isGuest || p.name !== "Guest");
  const today = todayKey();

  const hire = () => {
    if (!name.trim()) {
      toast.error(t("on.needName"));
      return;
    }
    hireStaff({
      name: name.trim(),
      phone,
      salary: salary ? Number(salary) : null,
      roles: [role],
      avatarDataUrl: avatar,
      staffPerms: defaultStaffPerms([role]),
    });
    toast.success(t("staff.hired", { name: name.trim() }));
    setName("");
    setPhone("");
    setSalary("");
    setAvatar(null);
    setOpen(false);
  };

  return (
    <AppShell title={t("staff.title")} subtitle={shop.name}>
      <div className="space-y-3">
        <PageGuide text={t("guide.staff")} />
        <Card className="border-0">
          <CardContent className="space-y-2 py-4">
            <p className="text-[12px] font-semibold text-muted">{t("staff.shopCode")}</p>
            <div className="flex items-center gap-2">
              <p className="flex-1 rounded-[var(--radius-md)] bg-elevated px-3 py-2.5 font-mono text-[18px] font-bold tracking-[0.14em] text-fg">
                {shopCode}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="h-11"
                onClick={() => {
                  void navigator.clipboard?.writeText(shopCode);
                  toast.success(t("staff.copied"));
                }}
              >
                <Copy className="size-4" />
              </Button>
            </div>
            <p className="text-[12px] leading-snug text-muted">{t("staff.codeHint")}</p>
          </CardContent>
        </Card>

        {canHire ? (
          open ? (
            <Card className="border-0">
              <CardContent className="space-y-3 py-4">
                <p className="text-[15px] font-semibold text-fg">{t("staff.hire")}</p>
                <ImageCapture
                  value={avatar}
                  onChange={setAvatar}
                  label={t("staff.photo")}
                  capture="user"
                  hint={t("staff.photoHint")}
                  cameraLabel={t("staff.capture")}
                  galleryLabel={t("staff.gallery")}
                />
                <div className="grid gap-1.5">
                  <Label>{t("on.name")}</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label>{t("on.phone")}</Label>
                  <Input
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>{t("staff.salary")}</Label>
                  <Input
                    inputMode="numeric"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    placeholder="12000"
                  />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {HIRE_ROLES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={cn(
                        "min-h-11 rounded-[var(--radius-md)] border text-[12px] font-semibold",
                        role === r
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-elevated text-muted",
                      )}
                    >
                      {t(`on.${r}`)}
                    </button>
                  ))}
                </div>
                <Button className="h-12 w-full" onClick={hire}>
                  <UserPlus className="size-4" />
                  {t("staff.saveHire")}
                </Button>
                <Button variant="outline" className="h-11 w-full" onClick={() => setOpen(false)}>
                  {t("common.cancel")}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Button className="h-12 w-full" onClick={() => setOpen(true)}>
              <Plus className="size-4" />
              {t("staff.hire")}
            </Button>
          )
        ) : null}

        <ul className="space-y-2">
          {staff.map((p) => {
            const day = attendanceFor(p.attendance, today);
            return (
              <li key={p.id}>
                <Link
                  to="/staff/$staffId"
                  params={{ staffId: p.id }}
                  data-testid={`staff-card-${p.id}`}
                  className="flex items-center gap-3 rounded-[var(--radius-lg)] bg-surface px-3 py-2.5 shadow-[var(--shadow-card)]"
                >
                  <span className="flex size-12 shrink-0 overflow-hidden rounded-full bg-primary/15 text-primary">
                    {p.avatarDataUrl ? (
                      <img src={p.avatarDataUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <span className="m-auto text-[15px] font-bold">{staffInitial(p.name)}</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-fg">
                      {p.name}
                      {p.id === me?.id ? (
                        <span className="ml-1 text-[11px] font-medium text-muted">
                          · {t("staff.you")}
                        </span>
                      ) : null}
                      {p.isOwner ? (
                        <span className="ml-1 text-[11px] font-medium text-primary">
                          · {t("staff.owner")}
                        </span>
                      ) : null}
                    </span>
                    <span className="block truncate text-[11px] text-muted">
                      {p.roles.map((r) => t(`on.${r}`)).join(", ")}
                      {p.salary ? ` · ${formatINR(p.salary)}` : ""}
                    </span>
                  </span>
                  {day?.status ? (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold",
                        day.status === "present" && "bg-success/15 text-success",
                        day.status === "half" && "bg-warning/15 text-warning",
                        day.status === "leave" && "bg-primary/15 text-primary",
                        day.status === "absent" && "bg-danger/15 text-danger",
                      )}
                    >
                      {t(`staff.status.${day.status}`)}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </AppShell>
  );
}
