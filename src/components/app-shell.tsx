import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, Menu, ScanLine, UserRound } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SideMenu } from "@/components/side-menu";
import { FloatingDock } from "@/components/floating-dock";
import { HelpTip } from "@/components/help-tip";
import { AiHeaderButton, AiBuyerSheet } from "@/components/ai-buyer-card";
import { NoticeBell } from "@/components/notice-bell";
import { useActiveProfile, useStockStore } from "@/lib/store";
import { useT } from "@/lib/i18n-context";
import { useDockScroll } from "@/lib/use-dock-scroll";
import { bindOnlineFlush, clearQueue } from "@/lib/offline-queue";

export function AppShell({
  children,
  title,
  subtitle,
  hideNav = false,
  hideSell: _hideSell = false,
  tipKey,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  hideNav?: boolean;
  hideSell?: boolean;
  tipKey?: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const profile = useActiveProfile();
  const { t } = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const { dockHidden, keyboardOpen } = useDockScroll(mainRef);
  const submitSale = useStockStore((s) => s.submitSale);

  useEffect(() => {
    return bindOnlineFlush((items) => {
      let ok = 0;
      for (const item of items) {
        const payload = item.payload as Parameters<typeof submitSale>[0];
        try {
          const res = submitSale(payload);
          if (res.ok) ok += 1;
        } catch {
          /* keep going */
        }
      }
      clearQueue();
      if (ok) toast.success(t("offline.synced", { n: ok }));
    });
  }, [submitSale, t]);

  const initial = (profile?.name || "?").trim().charAt(0).toUpperCase();
  const isHome = pathname === "/";
  const dockState = hideNav ? "none" : dockHidden ? "hidden" : "visible";

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }
    void navigate({ to: "/" });
  };

  return (
    <div
      className="app-shell relative mx-auto flex h-svh max-h-svh w-full max-w-lg flex-col overflow-hidden bg-bg md:max-w-3xl lg:max-w-5xl"
      data-dock={dockState}
      data-keyboard={keyboardOpen ? "open" : "closed"}
    >
      <div
        className="shrink-0 no-print"
        style={{ height: "var(--grok-banner-h, 0px)" }}
        aria-hidden
      />

      <header className="z-30 shrink-0 px-3 pb-1 pt-2 no-print sm:px-4">
        <div className="flex items-center gap-2">
          {!isHome ? (
            <button
              type="button"
              onClick={goBack}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-fg shadow-[var(--shadow-card)] ring-1 ring-border/70"
              aria-label={t("common.back")}
            >
              <ChevronLeft className="size-5" strokeWidth={2.2} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-fg shadow-[var(--shadow-card)] ring-1 ring-border/70"
              aria-label={t("menu.open")}
            >
              <Menu className="size-[1.15rem]" strokeWidth={2} />
            </button>
          )}

          <div className="flex min-w-0 flex-1 items-center gap-2">
            {isHome ? (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.85rem] bg-primary text-primary-fg shadow-sm">
                <ScanLine className="size-4" strokeWidth={2.4} />
              </span>
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold tracking-tight text-fg">
                {isHome ? t("appName") : title || t("appName")}
              </p>
              <p className="truncate text-[11px] text-muted">
                {isHome
                  ? subtitle || profile?.shopName || profile?.name
                  : subtitle || profile?.name || ""}
              </p>
            </div>
            {tipKey ? <HelpTip tipKey={tipKey} side="bottom" /> : null}
          </div>

          {!isHome ? (
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-fg ring-1 ring-border/70"
              aria-label={t("menu.open")}
            >
              <Menu className="size-[1.15rem]" />
            </button>
          ) : null}

          <NoticeBell />

          <AiHeaderButton open={aiOpen} onOpen={() => setAiOpen(true)} />

          <Link
            to="/profile"
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-sm font-bold text-primary shadow-[var(--shadow-card)] ring-1 ring-border/70",
              pathname.startsWith("/profile") && "ring-primary/40 bg-primary/10",
            )}
            aria-label={t("nav.profile")}
          >
            {initial && initial !== "?" ? (
              initial
            ) : (
              <UserRound className="size-4 text-fg" />
            )}
          </Link>
        </div>
      </header>

      <main
        ref={mainRef}
        className="app-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-3 pt-2 sm:px-4"
        style={{
          paddingBottom: hideNav
            ? "max(1.25rem, env(safe-area-inset-bottom))"
            : "var(--dock-total)",
        }}
      >
        {children}
        <div className="h-2 shrink-0" aria-hidden />
      </main>

      {!hideNav ? (
        <FloatingDock
          onMore={() => setMenuOpen(true)}
          moreOpen={menuOpen}
        />
      ) : null}

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <AiBuyerSheet open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}
