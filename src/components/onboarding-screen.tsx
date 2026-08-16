import { useNavigate } from "@tanstack/react-router";
import { ChevronsRight, Users } from "lucide-react";
import { useStockStore } from "@/lib/store";
import { useT } from "@/lib/i18n-context";

export function OnboardingScreen() {
  const { t } = useT();
  const navigate = useNavigate();
  const completeSplash = useStockStore((s) => s.completeSplash);
  const ensureGuest = useStockStore((s) => s.ensureGuest);

  const enter = (to: "/" | "/profile") => {
    ensureGuest();
    completeSplash();
    void navigate({ to });
  };

  return (
    <div
      className="splash-screen relative mx-auto flex h-svh max-h-svh w-full max-w-lg flex-col overflow-hidden"
      data-testid="onboarding-screen"
    >
      <img
        src="/onboard-hero.jpg"
        alt=""
        className="splash-hero"
        draggable={false}
      />
      <div className="splash-veil-top" aria-hidden />
      <div className="splash-veil-bottom" aria-hidden />

      <div
        className="relative z-10 flex min-h-0 flex-1 flex-col"
        style={{
          paddingTop: "calc(var(--grok-banner-h, 2.75rem) + 0.65rem)",
        }}
      >
        <div className="min-h-0 flex-1" aria-hidden />

        <div className="flex shrink-0 justify-center px-10 pb-3">
          <div className="h-1 w-full max-w-28 overflow-hidden rounded-full bg-splash-track/80">
            <div className="h-full w-1/3 rounded-full bg-splash-bar" />
          </div>
        </div>

        <header className="shrink-0 px-5 pb-3 text-center sm:px-8">
          <h1 className="splash-title text-splash-fg text-balance">
            {t("splash.title")}
          </h1>
          <p className="splash-sub mx-auto mt-2 max-w-[18.5rem] text-splash-muted text-pretty">
            {t("splash.sub")}
          </p>
        </header>

        <div
          className="shrink-0 space-y-2 px-4 pt-1 sm:px-6"
          style={{
            paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
          }}
        >
          <button
            type="button"
            onClick={() => enter("/")}
            className="flex h-12 w-full items-center justify-between rounded-full bg-splash-cta pl-5 pr-1.5 text-left shadow-[var(--shadow-soft)] active:scale-[0.99]"
            data-testid="splash-start"
          >
            <span className="text-[15px] font-semibold tracking-tight text-splash-fg">
              {t("splash.start")}
            </span>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-splash-dot text-splash-cta">
              <ChevronsRight className="size-5" strokeWidth={2.4} />
            </span>
          </button>
          <p className="pb-1 text-center text-[13px] leading-snug text-splash-muted">
            {t("splash.haveAccount")}{" "}
            <button
              type="button"
              onClick={() => enter("/profile")}
              className="min-h-11 px-1 font-semibold text-splash-link underline-offset-2 hover:underline"
            >
              {t("splash.signIn")}
            </button>
          </p>
          <button
            type="button"
            onClick={() => void navigate({ to: "/join" })}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-splash-track/70 text-[13px] font-semibold text-splash-fg"
            data-testid="splash-join"
          >
            <Users className="size-4" />
            {t("splash.joinStaff")}
          </button>
        </div>
      </div>
    </div>
  );
}
