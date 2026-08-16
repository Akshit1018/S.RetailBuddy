import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { AttendanceMonth } from "@/components/attendance-month";
import { SalarySlipCard } from "@/components/salary-slip-card";
import { ImageCapture } from "@/components/image-capture";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActiveProfile, useStockStore } from "@/lib/store";
import { canManageTeam, HIRE_ROLES } from "@/lib/rbac";
import {
  PRODUCT_CATEGORIES,
  defaultStaffPerms,
  effectiveStaffPerms,
} from "@/lib/staff";
import type { DiscountMode, StaffPerms, UserRole } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";
import { useT } from "@/lib/i18n-context";

export const Route = createFileRoute("/staff/$staffId")({
  component: StaffDetailPage,
});

function StaffDetailPage() {
  const { staffId } = Route.useParams();
  const { t } = useT();
  const me = useActiveProfile();
  const person = useStockStore((s) => s.profiles.find((p) => p.id === staffId));
  const products = useStockStore((s) => s.products);
  const updateProfile = useStockStore((s) => s.updateProfile);
  const markAttendance = useStockStore((s) => s.markAttendance);
  const punchAttendance = useStockStore((s) => s.punchAttendance);
  const owner = canManageTeam(me?.roles ?? []);
  const self = me?.id === staffId;
  const canEdit = owner || self;

  const [name, setName] = useState(person?.name || "");
  const [phone, setPhone] = useState(person?.phone || "");
  const [salary, setSalary] = useState(person?.salary?.toString() || "");
  const [roles, setRoles] = useState<UserRole[]>(person?.roles || ["maker"]);
  const [perms, setPerms] = useState<StaffPerms>(
    person ? effectiveStaffPerms(person) : defaultStaffPerms(["maker"]),
  );

  const catalog = useMemo(
    () => products.filter((p) => p.quantity >= 0).slice(0, 24),
    [products],
  );

  if (!person) {
    return (
      <AppShell title={t("staff.title")}>
        <p className="py-10 text-center text-sm text-muted">{t("staff.missing")}</p>
        <Link to="/staff">
          <Button variant="secondary" className="w-full">
            {t("common.back")}
          </Button>
        </Link>
      </AppShell>
    );
  }

  const save = () => {
    updateProfile(person.id, {
      name,
      phone,
      salary: salary ? Number(salary) : null,
      roles,
      staffPerms: perms,
    });
    toast.success(t("staff.saved"));
  };

  const toggleRole = (r: UserRole) => {
    setRoles((prev) => {
      const next = prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r];
      return next.length ? next : prev;
    });
  };

  const setFlag = (key: keyof StaffPerms, value: boolean | number | DiscountMode | string[]) => {
    setPerms((p) => ({ ...p, [key]: value }));
  };

  return (
    <AppShell title={person.name} subtitle={t("staff.title")}>
      <div className="space-y-3">
        <Card className="border-0">
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center gap-3">
              <span className="flex size-16 overflow-hidden rounded-full bg-primary/15">
                {person.avatarDataUrl ? (
                  <img src={person.avatarDataUrl} alt="" className="size-full object-cover" />
                ) : (
                  <span className="m-auto text-xl font-bold text-primary">
                    {person.name.charAt(0)}
                  </span>
                )}
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-fg">{person.name}</p>
                <p className="text-[12px] text-muted">
                  {person.phone || t("common.optional")}
                  {person.salary ? ` · ${formatINR(person.salary)}` : ""}
                </p>
              </div>
            </div>
            {owner ? (
              <ImageCapture
                value={person.avatarDataUrl}
                onChange={(url) => updateProfile(person.id, { avatarDataUrl: url })}
                label={t("staff.photo")}
                capture="user"
                hint={t("staff.photoHint")}
                cameraLabel={t("staff.capture")}
                galleryLabel={t("staff.gallery")}
              />
            ) : null}

            {canEdit ? (
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="h-11"
                variant="secondary"
                data-testid="staff-punch-in"
                onClick={() => {
                  const res = punchAttendance(person.id, "in");
                  if (res.ok) toast.success(t("staff.punchedIn"));
                }}
              >
                <LogIn className="size-4" />
                {t("staff.punchIn")}
              </Button>
              <Button
                className="h-11"
                variant="outline"
                data-testid="staff-punch-out"
                onClick={() => {
                  const res = punchAttendance(person.id, "out");
                  if (res.ok) toast.success(t("staff.punchedOut"));
                }}
              >
                <LogOut className="size-4" />
                {t("staff.punchOut")}
              </Button>
            </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardContent className="space-y-2 py-4">
            <p className="text-[14px] font-semibold text-fg">{t("staff.attendance")}</p>
            <AttendanceMonth
              days={person.attendance}
              readOnly={!canEdit}
              onCycle={(date, status) => markAttendance(person.id, date, status)}
            />
          </CardContent>
        </Card>

        <SalarySlipCard staff={person} />

        {owner ? (
          <Card className="border-0">
            <CardContent className="space-y-3 py-4">
              <p className="text-[14px] font-semibold text-fg">{t("staff.edit")}</p>
              <div className="grid gap-1.5">
                <Label>{t("on.name")}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("on.phone")}</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("staff.salary")}</Label>
                <Input value={salary} onChange={(e) => setSalary(e.target.value)} inputMode="numeric" />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {HIRE_ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRole(r)}
                    className={cn(
                      "min-h-11 rounded-[var(--radius-md)] border text-[12px] font-semibold",
                      roles.includes(r)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-elevated text-muted",
                    )}
                  >
                    {t(`on.${r}`)}
                  </button>
                ))}
              </div>

              <p className="pt-1 text-[13px] font-semibold text-fg">{t("staff.perms")}</p>
              {(
                [
                  ["viewStock", "staff.perm.view"],
                  ["stockIn", "staff.perm.in"],
                  ["stockOut", "staff.perm.out"],
                  ["sell", "staff.perm.sell"],
                  ["whatsapp", "staff.perm.wa"],
                  ["collectPay", "staff.perm.pay"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex min-h-11 items-center gap-3 text-[13px] text-fg">
                  <input
                    type="checkbox"
                    className="size-5"
                    checked={Boolean(perms[key])}
                    onChange={(e) => setFlag(key, e.target.checked)}
                  />
                  {t(label)}
                </label>
              ))}

              <div className="grid gap-1.5">
                <Label>{t("staff.discMode")}</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["none", "all", "category", "product"] as DiscountMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFlag("discountMode", m)}
                      className={cn(
                        "min-h-11 rounded-[var(--radius-md)] border text-[12px] font-semibold",
                        perms.discountMode === m
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-elevated text-muted",
                      )}
                    >
                      {t(`staff.mode.${m}`)}
                    </button>
                  ))}
                </div>
              </div>
              {perms.discountMode !== "none" ? (
                <div className="grid gap-1.5">
                  <Label>{t("staff.maxDisc")}</Label>
                  <Input
                    inputMode="numeric"
                    value={String(perms.discountMaxPct)}
                    onChange={(e) => setFlag("discountMaxPct", Number(e.target.value) || 0)}
                  />
                </div>
              ) : null}
              {perms.discountMode === "category" ? (
                <div className="flex flex-wrap gap-1.5">
                  {PRODUCT_CATEGORIES.map((c) => {
                    const on = perms.discountCategories.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() =>
                          setFlag(
                            "discountCategories",
                            on
                              ? perms.discountCategories.filter((x) => x !== c)
                              : [...perms.discountCategories, c],
                          )
                        }
                        className={cn(
                          "min-h-10 rounded-full px-3 text-[12px] font-semibold",
                          on ? "bg-primary text-primary-fg" : "bg-elevated text-muted",
                        )}
                      >
                        {t(`staff.cat.${c}`)}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              {perms.discountMode === "product" ? (
                <ul className="max-h-48 space-y-1 overflow-y-auto">
                  {catalog.map((p) => {
                    const on = perms.discountProductIds.includes(p.id);
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() =>
                            setFlag(
                              "discountProductIds",
                              on
                                ? perms.discountProductIds.filter((x) => x !== p.id)
                                : [...perms.discountProductIds, p.id],
                            )
                          }
                          className={cn(
                            "flex min-h-11 w-full items-center justify-between rounded-md px-2 text-left text-[13px]",
                            on ? "bg-primary/10 text-fg" : "bg-elevated text-muted",
                          )}
                        >
                          <span className="truncate">{p.name}</span>
                          <span className="text-[11px]">{formatINR(p.unitPrice)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              <Button className="h-12 w-full" onClick={save}>
                {t("staff.savedBtn")}
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
