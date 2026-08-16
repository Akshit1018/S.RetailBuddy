import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useStockStore } from "@/lib/store";
import { WelcomePopup } from "@/components/welcome-popup";
import { OnboardingScreen } from "@/components/onboarding-screen";
import { PinLock } from "@/components/pin-lock";

export function ProfileGate({ children }: { children: React.ReactNode }) {
  const ensureGuest = useStockStore((s) => s.ensureGuest);
  const splashSeen = useStockStore((s) => s.splashSeen);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const publicPage =
    pathname === "/shop" || pathname === "/join" || pathname.startsWith("/pay");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = useStockStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    setHydrated(useStockStore.persist.hasHydrated());
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    ensureGuest();
  }, [hydrated, ensureGuest]);

  if (!hydrated) {
    return (
      <div
        className="flex min-h-svh items-center justify-center bg-bg text-sm text-muted"
        style={{ paddingTop: "var(--grok-banner-h, 0px)" }}
      >
        Loading…
      </div>
    );
  }

  if (publicPage) return <>{children}</>;

  if (!splashSeen) {
    return <OnboardingScreen />;
  }

  return (
    <PinLock>
      {children}
      <WelcomePopup />
    </PinLock>
  );
}
