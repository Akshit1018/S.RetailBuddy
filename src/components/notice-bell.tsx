import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useStockStore } from "@/lib/store";
import { buildNotices, unreadCount } from "@/lib/notices";
import { formatINR } from "@/lib/utils";
import { buildUpiLink } from "@/lib/upi";
import { reminderText } from "@/lib/installments";
import { openWhatsApp } from "@/lib/whatsapp";
import { useT } from "@/lib/i18n-context";
import { cn } from "@/lib/utils";

export function NoticeBell() {
  const { t } = useT();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const sales = useStockStore((s) => s.sales);
  const products = useStockStore((s) => s.products);
  const slips = useStockStore((s) => s.salarySlips);
  const settings = useStockStore((s) => s.settings);
  const readIds = useStockStore((s) => s.noticeReadIds);
  const markRead = useStockStore((s) => s.markNoticesRead);
  const shop = useStockStore((s) => s.shop);
  const upiId = useStockStore((s) => s.upiId);

  const notices = useMemo(
    () =>
      buildNotices({
        sales,
        products,
        slips,
        settings,
        shopKind: settings.shopKind,
      }),
    [sales, products, slips, settings],
  );
  const unread = unreadCount(notices, readIds);

  const callToday = notices.filter((n) => n.kind === "due_call");

  const remind = (n: (typeof notices)[0]) => {
    if (!n.phone) {
      toast.error(t("bell.noPhone"));
      return;
    }
    const sale = sales.find((s) => n.href?.includes(s.id));
    const upi =
      upiId && n.amount
        ? buildUpiLink({
            pa: upiId,
            pn: shop.name,
            am: n.amount,
            tn: sale?.billNo || "due",
          })
        : undefined;
    const text = reminderText({
      shopName: shop.name,
      customerName: n.title.replace(/^Call\s+/, ""),
      billNo: sale?.billNo || "",
      amount: n.amount || 0,
      dueDate: n.at,
      upiLink: upi,
    });
    const digits = n.phone.replace(/\D/g, "");
    const phone = digits.length === 10 ? `91${digits}` : digits;
    openWhatsApp(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`);
  };

  return (
    <div className="relative">
      <button
        type="button"
        data-testid="notice-bell"
        onClick={() => {
          setOpen((v) => !v);
          if (!open && notices.length) markRead(notices.map((n) => n.id));
        }}
        className={cn(
          "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-fg shadow-[var(--shadow-card)] ring-1 ring-border/70",
          open && "ring-primary/40 bg-primary/10",
        )}
        aria-label={t("bell.title")}
      >
        <Bell className="size-4" strokeWidth={2.1} />
        {unread > 0 ? (
          <span
            data-testid="notice-count"
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-primary-fg"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-fg/20"
            aria-label={t("common.close")}
            onClick={() => setOpen(false)}
          />
          <div
            data-testid="notice-panel"
            className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-nav)] ring-1 ring-border"
          >
            <div className="border-b border-border px-3 py-2">
              <p className="text-[13px] font-semibold text-fg">{t("bell.title")}</p>
              <p className="text-[11px] text-muted">{t("bell.sub")}</p>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {callToday.length ? (
                <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-subtle">
                  {t("bell.callToday")}
                </p>
              ) : null}
              {notices.length === 0 ? (
                <p className="px-2 py-6 text-center text-[13px] text-muted">
                  {t("bell.empty")}
                </p>
              ) : (
                notices.map((n) => (
                  <div
                    key={n.id}
                    className="mb-1.5 rounded-[var(--radius-md)] bg-elevated px-3 py-2"
                  >
                    <p className="text-[13px] font-semibold text-fg">{n.title}</p>
                    <p className="text-[11px] text-muted">{n.body}</p>
                    {n.amount ? (
                      <p className="mt-0.5 text-[13px] font-semibold tabular text-fg">
                        {formatINR(n.amount)}
                      </p>
                    ) : null}
                    <div className="mt-2 flex gap-1.5">
                      {n.href ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setOpen(false);
                            void navigate({ to: n.href as never });
                          }}
                        >
                          {t("bell.open")}
                        </Button>
                      ) : null}
                      {n.kind === "due_call" ? (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => remind(n)}
                        >
                          {t("bell.wa")}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
