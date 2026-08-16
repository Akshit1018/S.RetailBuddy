import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/app-shell";
import { PageGuide } from "@/components/page-guide";
import { LineItemsTable } from "@/components/line-items-table";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveProfile, useStockStore } from "@/lib/store";
import type { Invoice, LineItem } from "@/lib/types";
import { canCheck, canVerify, formatDate, formatINR } from "@/lib/utils";
import { denyMessage } from "@/lib/rbac";
import { useT } from "@/lib/i18n-context";

const searchSchema = z.object({
  id: z.string().optional(),
});

export const Route = createFileRoute("/review")({
  validateSearch: searchSchema,
  component: ReviewPage,
});

function ReviewPage() {
  const { id: focusId } = Route.useSearch();
  const { t } = useT();
  const invoices = useStockStore((s) => s.invoices);
  const profile = useActiveProfile();
  const updateInvoiceLines = useStockStore((s) => s.updateInvoiceLines);
  const setInvoiceStatus = useStockStore((s) => s.setInvoiceStatus);

  const stockIn = useMemo(
    () => invoices.filter((i) => i.kind === "stock_in"),
    [invoices],
  );

  const [selectedId, setSelectedId] = useState<string | null>(
    focusId ?? stockIn[0]?.id ?? null,
  );
  const selected = stockIn.find((i) => i.id === selectedId) ?? null;
  const [draft, setDraft] = useState<LineItem[] | null>(null);

  useEffect(() => {
    if (focusId) setSelectedId(focusId);
  }, [focusId]);

  const roles = profile?.roles ?? [];
  const lines = draft ?? selected?.lines ?? [];
  const editing = draft !== null;

  const open = (inv: Invoice) => {
    setSelectedId(inv.id);
    setDraft(null);
  };

  const startEdit = () => {
    if (!selected) return;
    if (!canVerify(roles) && !canCheck(roles)) {
      toast.message(denyMessage("check"));
      return;
    }
    setDraft(selected.lines.map((l) => ({ ...l })));
  };

  const saveEdit = () => {
    if (!selected || !draft) return;
    updateInvoiceLines(selected.id, draft);
    setDraft(null);
    toast.success("Bill updated");
  };

  const markChecked = () => {
    if (!selected) return;
    if (!canCheck(roles)) {
      toast.error(denyMessage("check"));
      return;
    }
    setInvoiceStatus(selected.id, "checked");
    toast.success(`Checked by ${profile?.name}`);
  };

  const markVerified = () => {
    if (!selected) return;
    if (!canVerify(roles)) {
      toast.error(denyMessage("verify"));
      return;
    }
    if (editing && draft) {
      updateInvoiceLines(selected.id, draft);
      setDraft(null);
    }
    setInvoiceStatus(selected.id, "verified");
    toast.success(`Verified by ${profile?.name}`);
  };

  return (
    <AppShell title={t("review.title")}>
      <div className="space-y-3.5 fade-in">
        <PageGuide text={t("guide.review")} />

        {stockIn.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-border-strong px-4 py-8 text-center text-sm text-muted">
            No purchase bills yet. Use Stock In first.
          </div>
        ) : (
          <div className="space-y-2">
            {stockIn.map((inv) => (
              <button
                key={inv.id}
                type="button"
                onClick={() => open(inv)}
                className={`w-full rounded-[var(--radius-lg)] border p-3 text-left transition-colors active:scale-[0.99] ${
                  selectedId === inv.id
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-surface hover:bg-elevated"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">
                      {inv.supplier || "Supplier"}
                    </p>
                    <p className="text-xs text-muted">
                      by {inv.createdByName || "—"} ·{" "}
                      {formatDate(inv.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={inv.status} />
                </div>
              </button>
            ))}
          </div>
        )}

        {selected ? (
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-2 space-y-0 pb-2">
              <div className="min-w-0">
                <CardTitle className="truncate text-base">
                  {selected.supplier || "Purchase bill"}
                </CardTitle>
                <p className="mt-1 text-xs text-muted">
                  {selected.invoiceNo} · {formatINR(selected.totalCost)}
                </p>
              </div>
              <StatusBadge status={selected.status} />
            </CardHeader>
            <CardContent className="space-y-3">
              {selected.imageDataUrl ? (
                <img
                  src={selected.imageDataUrl}
                  alt="Bill"
                  className="max-h-36 w-full rounded-[var(--radius-md)] border border-border bg-bg object-contain"
                  crossOrigin="anonymous"
                />
              ) : null}

              <div className="flex flex-wrap gap-2">
                {selected.status === "pending" ? (
                  <Badge variant="warning">Verification pending</Badge>
                ) : null}
                {selected.checkedByName ? (
                  <Badge variant="info">
                    Checked: {selected.checkedByName}
                  </Badge>
                ) : null}
                {selected.verifiedByName ? (
                  <Badge variant="success">
                    Verified: {selected.verifiedByName}
                  </Badge>
                ) : null}
              </div>

              <LineItemsTable
                lines={lines}
                onChange={editing ? setDraft : undefined}
                editable={editing}
              />

              <div className="flex flex-col gap-2">
                {!editing && selected.status !== "verified" ? (
                  <Button variant="secondary" onClick={startEdit}>
                    {t("common.edit")} quantities
                  </Button>
                ) : null}
                {editing ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => setDraft(null)}>
                      {t("common.cancel")}
                    </Button>
                    <Button onClick={saveEdit}>{t("common.save")}</Button>
                  </div>
                ) : null}
                {selected.status === "pending" ? (
                  <Button
                    variant="secondary"
                    onClick={markChecked}
                    disabled={!canCheck(roles)}
                  >
                    {t("review.check")}
                  </Button>
                ) : null}
                {selected.status !== "verified" ? (
                  <Button onClick={markVerified} disabled={!canVerify(roles)}>
                    {t("review.verify")}
                  </Button>
                ) : (
                  <p className="text-center text-sm text-success">
                    Verified{" "}
                    {selected.verifiedAt
                      ? formatDate(selected.verifiedAt)
                      : ""}
                  </p>
                )}
                {!canCheck(roles) && !canVerify(roles) ? (
                  <p className="col-span-full text-center text-[11px] text-muted">
                    {t("rbac.needFor", { job: t("review.title") })}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
