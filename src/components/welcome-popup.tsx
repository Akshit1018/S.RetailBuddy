import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStockStore } from "@/lib/store";
import type { UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-context";

/**
 * Optional welcome popup — app already runs as Guest.
 * User can close with X, stay guest, or optionally verify phone + set roles.
 */
export function WelcomePopup() {
  const welcomeDismissed = useStockStore((s) => s.welcomeDismissed);
  const dismissWelcome = useStockStore((s) => s.dismissWelcome);
  const upgradeFromGuest = useStockStore((s) => s.upgradeFromGuest);
  const skipAsGuest = useStockStore((s) => s.skipAsGuest);
  const { t } = useT();

  const [name, setName] = useState("");
  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpOk, setOtpOk] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [roles, setRoles] = useState<UserRole[]>(["maker"]);
  const [demoOtp] = useState(() => String(1000 + Math.floor(Math.random() * 9000)));

  // Prevent body scroll while open
  useEffect(() => {
    if (welcomeDismissed) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [welcomeDismissed]);

  if (welcomeDismissed) return null;

  const close = () => {
    skipAsGuest();
    dismissWelcome();
  };

  const toggleRole = (role: UserRole) => {
    setRoles((prev) => {
      if (prev.includes(role)) return prev.filter((r) => r !== role);
      return [...prev, role];
    });
  };

  const sendOtp = () => {
    const p = phone.replace(/\D/g, "");
    if (p.length < 10) {
      toast.error(t("welcome.needPhone"));
      return;
    }
    setOtpSent(true);
    setOtp("");
    setOtpOk(false);
    toast.success(t("welcome.otpSent", { code: demoOtp }));
  };

  const verifyOtp = () => {
    if (otp.trim() === demoOtp || otp.trim() === "1234") {
      setOtpOk(true);
      toast.success(t("welcome.otpOk"));
    } else {
      toast.error(t("welcome.otpBad"));
    }
  };

  const saveProfile = () => {
    if (showOtp && phone && !otpOk) {
      toast.error(t("welcome.verifyFirst"));
      return;
    }
    if (roles.length === 0) {
      toast.error(t("on.needRole"));
      return;
    }
    upgradeFromGuest({
      name: name.trim() || "Staff",
      shopName: shopName.trim() || undefined,
      phone: phone.trim() || undefined,
      roles,
      phoneVerified: otpOk,
    });
    toast.success(t("on.ready"));
  };

  const ROLE_OPTS: { id: UserRole; title: string; desc: string }[] = [
    { id: "maker", title: t("on.maker"), desc: t("on.makerDesc") },
    { id: "checker", title: t("on.checker"), desc: t("on.checkerDesc") },
    { id: "accountant", title: t("on.accountant"), desc: t("on.accountantDesc") },
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-bg/70 backdrop-blur-[3px]"
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("welcome.title")}
        className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-t-[var(--radius-xl)] border border-border bg-surface shadow-[var(--shadow-nav)] sm:mb-6 sm:rounded-[var(--radius-xl)]"
        style={{
          maxHeight: "min(88svh, calc(100svh - var(--grok-banner-h, 2.75rem) - 0.75rem))",
          paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold text-fg">
              {t("welcome.title")}
            </h2>
            <p className="truncate text-[11px] text-muted">{t("welcome.sub")}</p>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-elevated text-fg"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="app-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-4 py-3">
          <p className="rounded-[var(--radius-md)] bg-primary/8 px-3 py-2 text-[12px] leading-snug text-muted">
            {t("welcome.guestNote")}
          </p>

          <div className="grid gap-1.5">
            <Label htmlFor="w-name">{t("on.name")}</Label>
            <Input
              id="w-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("welcome.namePh")}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="w-shop">{t("on.shop")}</Label>
            <Input
              id="w-shop"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder={t("common.optional")}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("on.roles")}</Label>
            <div className="space-y-1">
              {ROLE_OPTS.map((opt) => {
                const on = roles.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleRole(opt.id)}
                    className={cn(
                      "flex min-h-11 w-full items-center gap-2.5 rounded-[var(--radius-md)] border px-3 py-2 text-left",
                      on
                        ? "border-primary/50 bg-primary/10"
                        : "border-border bg-elevated",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                        on
                          ? "border-primary bg-primary text-primary-fg"
                          : "border-border-strong",
                      )}
                    >
                      {on ? <Check className="size-3" strokeWidth={3} /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-fg">
                        {opt.title}
                      </span>
                      <span className="block text-[11px] leading-snug text-muted">
                        {opt.desc}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-border bg-elevated/50 p-3">
            <label className="flex min-h-11 items-center gap-3 text-sm text-fg">
              <input
                type="checkbox"
                checked={showOtp}
                onChange={(e) => {
                  setShowOtp(e.target.checked);
                  if (!e.target.checked) {
                    setOtpSent(false);
                    setOtpOk(false);
                    setOtp("");
                  }
                }}
                className="size-5 rounded border-border"
              />
              <span>
                <span className="font-medium">{t("welcome.otpToggle")}</span>
                <span className="mt-0.5 block text-[11px] text-muted">
                  {t("welcome.otpHint")}
                </span>
              </span>
            </label>

            {showOtp ? (
              <div className="mt-3 space-y-2 border-t border-border pt-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="w-phone">{t("on.phone")}</Label>
                  <div className="flex flex-col gap-2">
                    <Input
                      id="w-phone"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setOtpOk(false);
                        setOtpSent(false);
                      }}
                      inputMode="tel"
                      placeholder="9876543210"
                      className="min-w-0"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-11 w-full"
                      onClick={sendOtp}
                    >
                      {otpSent ? t("welcome.resend") : t("welcome.sendOtp")}
                    </Button>
                  </div>
                </div>
                {otpSent ? (
                  <div className="grid gap-1.5">
                    <Label htmlFor="w-otp">{t("welcome.otp")}</Label>
                    <div className="flex flex-col gap-2">
                      <Input
                        id="w-otp"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        inputMode="numeric"
                        placeholder="1234"
                        className="min-w-0"
                      />
                      <Button
                        type="button"
                        className="h-11 w-full"
                        onClick={verifyOtp}
                        disabled={otpOk}
                      >
                        {otpOk ? t("welcome.verified") : t("welcome.verify")}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted">
                      {t("welcome.demoOtp", { code: demoOtp })}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 space-y-1 border-t border-border px-4 pt-2.5">
          <Button type="button" size="lg" className="h-12 w-full" onClick={saveProfile}>
            {t("welcome.save")}
          </Button>
          <button
            type="button"
            className="flex h-11 w-full items-center justify-center text-[13px] font-semibold text-muted"
            onClick={close}
          >
            {t("welcome.guest")}
          </button>
        </div>
      </div>
    </div>
  );
}
