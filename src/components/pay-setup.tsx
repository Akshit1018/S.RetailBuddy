import { useRef, useState } from "react";
import { Check, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStockStore } from "@/lib/store";
import { fileToDataUrl } from "@/lib/ocr";
import { useT } from "@/lib/i18n-context";

/** One place to save UPI + QR — used on WhatsApp and Profile. */
export function PaySetupCard({ compact = false }: { compact?: boolean }) {
  const { t } = useT();
  const upiId = useStockStore((s) => s.upiId);
  const setUpiId = useStockStore((s) => s.setUpiId);
  const paymentQr = useStockStore((s) => s.paymentQrDataUrl);
  const setPaymentQr = useStockStore((s) => s.setPaymentQr);
  const [draft, setDraft] = useState(upiId || "");
  const qrRef = useRef<HTMLInputElement>(null);
  const ready = Boolean((upiId && upiId.includes("@")) || paymentQr);

  const save = () => {
    const v = draft.trim();
    if (v && !v.includes("@")) {
      toast.error(t("wa.upiBad"));
      return;
    }
    setUpiId(v || null);
    toast.success(t("wa.savePay"));
  };

  const onQr = async (file?: File | null) => {
    if (!file) return;
    const url = await fileToDataUrl(file);
    setPaymentQr(url);
    toast.success(t("pay.uploadQr"));
  };

  return (
    <section
      className="space-y-3 rounded-[var(--radius-lg)] bg-surface px-3.5 py-4 shadow-[var(--shadow-card)]"
      data-testid="pay-setup"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fg">{t("wa.setupTitle")}</p>
          {!compact ? (
            <p className="mt-0.5 text-[12px] leading-snug text-muted">
              {t("wa.setupHint")}
            </p>
          ) : null}
        </div>
        {ready ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-success">
            <Check className="size-3.5" strokeWidth={2.4} />
            {t("wa.setupReady")}
          </span>
        ) : null}
      </div>

      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-muted">
          {t("upi.id")}
        </span>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("wa.upiPh")}
          autoCapitalize="off"
          autoCorrect="off"
          inputMode="email"
        />
      </label>

      <input
        ref={qrRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void onQr(e.target.files?.[0])}
      />

      <div className="flex gap-2">
        <Button type="button" className="h-11 flex-1" onClick={save}>
          {t("wa.savePay")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="h-11 flex-1"
          onClick={() => qrRef.current?.click()}
        >
          <Upload className="size-4" />
          {t("pay.uploadQr")}
        </Button>
      </div>

      {paymentQr ? (
        <img
          src={paymentQr}
          alt=""
          className="mx-auto max-h-28 rounded-[var(--radius-md)] object-contain"
        />
      ) : null}
    </section>
  );
}
