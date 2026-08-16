import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageGuide } from "@/components/page-guide";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useStockStore } from "@/lib/store";
import { fillTemplate, shopPageUrl } from "@/lib/shop-order";
import type { LeadStatus } from "@/lib/types";
import { formatINR } from "@/lib/utils";
import { openWhatsApp } from "@/lib/whatsapp";
import { useT } from "@/lib/i18n-context";

export const Route = createFileRoute("/crm")({
  component: CrmPage,
});

const STATUSES: LeadStatus[] = ["new", "contacted", "quoted", "won", "lost"];

function CrmPage() {
  const { t } = useT();
  const leads = useStockStore((s) => s.leads);
  const customers = useStockStore((s) => s.customers);
  const templates = useStockStore((s) => s.waTemplates);
  const shop = useStockStore((s) => s.shop);
  const addLead = useStockStore((s) => s.addLead);
  const setLeadStatus = useStockStore((s) => s.setLeadStatus);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [filter, setFilter] = useState<LeadStatus | "all">("all");
  const [tplId, setTplId] = useState(templates[0]?.id ?? "");

  const list = useMemo(
    () => (filter === "all" ? leads : leads.filter((l) => l.status === filter)),
    [leads, filter],
  );

  const send = (phoneNo: string, person: string) => {
    const tpl = templates.find((x) => x.id === tplId) ?? templates[0];
    if (!tpl) return;
    const digits = phoneNo.replace(/\D/g, "");
    if (digits.length < 10) {
      toast.error(t("welcome.needPhone"));
      return;
    }
    const text = fillTemplate(tpl.body, {
      name: person,
      shop: shop.name,
      link: shopPageUrl(),
      amount: "",
    });
    openWhatsApp(
      `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}?text=${encodeURIComponent(text)}`,
    );
  };

  return (
    <AppShell title={t("crm.title")} subtitle={t("crm.sub")}>
      <div className="space-y-3.5 fade-in">
        <PageGuide text={t("guide.crm")} />
        <Card className="border-0">
          <CardContent className="space-y-2 py-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("on.name")}
              />
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="WhatsApp"
                inputMode="tel"
              />
            </div>
            <Button
              className="w-full"
              onClick={() => {
                if (!name.trim()) {
                  toast.error(t("on.needName"));
                  return;
                }
                addLead({ name, phone, source: "manual" });
                setName("");
                setPhone("");
                toast.success(t("crm.added"));
              }}
            >
              {t("crm.add")}
            </Button>
          </CardContent>
        </Card>

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted">{t("crm.template")}</p>
          <select
            className="h-11 w-full rounded-[var(--radius-md)] border border-border bg-elevated px-3 text-sm"
            value={tplId}
            onChange={(e) => setTplId(e.target.value)}
          >
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {(["all", ...STATUSES] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`h-9 shrink-0 rounded-full px-3 text-xs font-semibold ${
                filter === s ? "bg-fg text-bg" : "bg-muted-surface text-muted"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <ul className="space-y-2">
          {list.map((l) => (
            <li key={l.id}>
              <Card className="border-0">
                <CardContent className="space-y-2 py-3">
                  <div className="flex justify-between gap-2">
                    <div>
                      <p className="font-semibold text-fg">{l.name}</p>
                      <p className="text-xs text-muted">
                        {l.phone || "—"} · {l.source}
                        {l.value ? ` · ${formatINR(l.value)}` : ""}
                      </p>
                    </div>
                    <select
                      className="h-9 rounded-[var(--radius-md)] border border-border bg-elevated px-2 text-xs"
                      value={l.status}
                      onChange={(e) =>
                        setLeadStatus(l.id, e.target.value as LeadStatus)
                      }
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  {l.note ? (
                    <p className="text-xs text-muted">{l.note}</p>
                  ) : null}
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => send(l.phone, l.name)}
                  >
                    {t("crm.wa")}
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>

        <h2 className="text-sm font-semibold">{t("profile.customers")}</h2>
        <ul className="space-y-2">
          {customers.slice(0, 12).map((c) => (
            <li key={c.id}>
              <Card className="border-0">
                <CardContent className="flex items-center justify-between gap-2 py-3">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-[11px] text-muted">
                      {c.customerNo} · {c.whatsapp || c.phone || "—"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => send(c.whatsapp || c.phone || "", c.name)}
                  >
                    WA
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
