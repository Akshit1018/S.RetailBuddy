import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Camera,
  FileText,
  MessageCircle,
  Package,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageGuide } from "@/components/page-guide";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-context";

export const Route = createFileRoute("/help")({
  component: HelpPage,
});

function HelpPage() {
  const { t } = useT();

  const guides = [
    {
      icon: Camera,
      title: t("stockIn.title"),
      to: "/stock-in" as const,
      steps: [
        t("help.stockIn.1"),
        t("help.stockIn.2"),
        t("help.stockIn.3"),
        t("help.stockIn.4"),
      ],
    },
    {
      icon: ShoppingBag,
      title: t("sell.title"),
      to: "/sell" as const,
      steps: [t("help.sell.1"), t("help.sell.2"), t("help.sell.3"), t("help.sell.4")],
    },
    {
      icon: FileText,
      title: t("bills.title"),
      to: "/bills" as const,
      steps: [
        t("help.bills.1"),
        t("help.bills.2"),
        t("help.bills.3"),
        t("help.bills.4"),
      ],
    },
    {
      icon: MessageCircle,
      title: t("wa.title"),
      to: "/whatsapp" as const,
      steps: [t("help.wa.1"), t("help.wa.2"), t("help.wa.3"), t("help.wa.4")],
    },
    {
      icon: Wallet,
      title: t("home.payments"),
      to: "/bills" as const,
      steps: [
        t("help.pay.1"),
        t("help.pay.2"),
        t("help.pay.3"),
        t("help.pay.4"),
        t("help.pay.5"),
      ],
    },
    {
      icon: Package,
      title: t("home.sections"),
      to: "/stock" as const,
      steps: [
        t("help.sections.1"),
        t("help.sections.2"),
        t("help.sections.3"),
        t("help.sections.4"),
      ],
    },
  ];

  return (
    <AppShell title={t("help.title")} subtitle={t("help.subtitle")}>
      <div className="space-y-4 fade-in">
        <PageGuide text={t("guide.help")} />
        <Card>
          <CardContent className="py-4">
            <p className="text-sm font-semibold text-fg">{t("help.kb")}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {t("help.intro")}
            </p>
          </CardContent>
        </Card>

        {guides.map((g) => {
          const Icon = g.icon;
          return (
            <Card key={g.title}>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-elevated text-primary">
                    <Icon className="size-4" />
                  </span>
                  <CardTitle className="truncate text-sm">{g.title}</CardTitle>
                </div>
                <Link to={g.to}>
                  <Button size="sm" variant="secondary">
                    {t("bell.open")}
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-1.5 pb-4">
                {g.steps.map((s) => (
                  <p key={s} className="text-sm leading-relaxed text-muted">
                    {s}
                  </p>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
