import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useStockStore } from "@/lib/store";
import { hashPin, isSessionUnlocked, markSessionUnlocked } from "@/lib/pin";
import { useT } from "@/lib/i18n-context";

export function PinLock({ children }: { children: React.ReactNode }) {
  const hash = useStockStore((s) => s.staffPinHash);
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const { t } = useT();

  useEffect(() => {
    setUnlocked(!hash || isSessionUnlocked());
    setReady(true);
  }, [hash]);

  if (!ready) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-bg text-sm text-muted">
        {t("loading")}
      </div>
    );
  }
  if (!hash || unlocked) return <>{children}</>;

  const press = (d: string) => {
    if (pin.length >= 6) return;
    setPin((p) => p + d);
  };

  const submit = async (value = pin) => {
    if (value.length < 4) return;
    setBusy(true);
    try {
      const h = await hashPin(value);
      if (h === hash) {
        markSessionUnlocked();
        setUnlocked(true);
      } else {
        toast.error(t("pin.wrong"));
        setPin("");
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (pin.length === 4 || pin.length === 6) void submit(pin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  return (
    <div
      className="flex min-h-svh flex-col items-center justify-center bg-bg px-6"
      style={{ paddingTop: "var(--grok-banner-h, 0px)" }}
    >
      <div className="w-full max-w-xs space-y-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.1rem] bg-primary text-primary-fg">
          <Lock className="size-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-fg">{t("pin.unlock")}</h1>
          <p className="mt-1 text-sm text-muted">{t("pin.unlockHint")}</p>
        </div>
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.max(4, pin.length || 4) }).map((_, i) => (
            <span
              key={i}
              className={`h-3 w-3 rounded-full ${
                i < pin.length ? "bg-primary" : "bg-muted-surface"
              }`}
            />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "OK"].map(
            (k) => (
              <Button
                key={k}
                type="button"
                variant={k === "OK" ? "default" : "secondary"}
                className="h-14 text-lg"
                disabled={busy}
                onClick={() => {
                  if (k === "⌫") setPin((p) => p.slice(0, -1));
                  else if (k === "OK") void submit();
                  else press(k);
                }}
              >
                {k}
              </Button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
