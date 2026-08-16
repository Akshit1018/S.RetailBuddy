import type { VerificationStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n-context";

export function StatusBadge({ status }: { status: VerificationStatus }) {
  const { t } = useT();
  if (status === "verified")
    return <Badge variant="success">{t("status.verified")}</Badge>;
  if (status === "checked")
    return <Badge variant="info">{t("status.checked")}</Badge>;
  return <Badge variant="warning">{t("status.pending")}</Badge>;
}
