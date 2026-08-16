import { createFileRoute, Link } from "@tanstack/react-router";
import { useStockStore } from "@/lib/store";
import { buildBillUpi } from "@/lib/upi";
import { formatINR } from "@/lib/utils";
import { useT } from "@/lib/i18n-context";

export const Route = createFileRoute("/pay/$token")({
  component: PayLinkPage,
});

function PayLinkPage() {
  const { token } = Route.useParams();
  const { t } = useT();
  const link = useStockStore((s) => s.payLinks.find((p) => p.token === token));
  const sale = useStockStore((s) =>
    link?.saleId ? s.sales.find((x) => x.id === link.saleId) : undefined,
  );
  const shop = useStockStore((s) => s.shop);
  const upiId = useStockStore((s) => s.upiId);
  const paymentQr = useStockStore((s) => s.paymentQrDataUrl);
  const amount = link?.amount ?? sale?.totalRevenue ?? 0;
  const billNo = sale?.billNo || t("staff.payLink");
  const upi = upiId
    ? buildBillUpi({
        upiId,
        shopName: shop.name,
        amountDue: amount,
        billNo,
      })
    : null;

  return (
    <div
      className="mx-auto flex min-h-svh w-full max-w-lg flex-col bg-bg px-5"
      style={{ paddingTop: "calc(var(--grok-banner-h, 2.75rem) + 1rem)" }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
        {shop.name}
      </p>
      <h1 className="mt-1 text-[1.4rem] font-bold text-fg">{t("staff.payTitle")}</h1>
      <p className="mt-1 text-[13px] text-muted">{billNo}</p>
      <p className="mt-3 text-[2rem] font-bold tabular text-fg">{formatINR(amount)}</p>

      <div className="mt-5 rounded-[var(--radius-xl)] bg-surface p-4 shadow-[var(--shadow-card)]">
        {upi ? (
          <img
            src={upi.qrUrl}
            alt="UPI QR"
            className="mx-auto h-48 w-48 rounded-md bg-surface object-contain"
          />
        ) : paymentQr ? (
          <img
            src={paymentQr}
            alt="Shop QR"
            className="mx-auto max-h-48 rounded-md object-contain"
          />
        ) : (
          <p className="py-8 text-center text-sm text-muted">{t("pay.noQr")}</p>
        )}
        <dl className="mt-4 space-y-1.5 text-[13px]">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">{t("staff.upi")}</dt>
            <dd className="font-semibold text-fg">{upiId || "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">{t("on.phone")}</dt>
            <dd className="font-semibold text-fg">{shop.phone || shop.whatsapp || "—"}</dd>
          </div>
        </dl>
        {upi ? (
          <a href={upi.upiUrl} className="mt-4 block">
            <span className="flex h-12 items-center justify-center rounded-full bg-primary text-[15px] font-semibold text-primary-fg">
              {t("upi.pay")}
            </span>
          </a>
        ) : null}
      </div>
      <p className="mt-4 text-center text-[12px] text-muted">{t("staff.payHint")}</p>
      <Link to="/" className="mt-auto py-6 text-center text-[13px] font-semibold text-primary">
        {t("appName")}
      </Link>
    </div>
  );
}
