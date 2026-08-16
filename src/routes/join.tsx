import { useState } from "react";
import { useNavigate, createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { ImageCapture } from "@/components/image-capture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStockStore } from "@/lib/store";
import { DEMO_SHOP_CODE } from "@/lib/staff";
import { useT } from "@/lib/i18n-context";

export const Route = createFileRoute("/join")({
  component: JoinStaffPage,
});

function JoinStaffPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const joinShopStaff = useStockStore((s) => s.joinShopStaff);
  const shopCode = useStockStore((s) => s.shopCode || DEMO_SHOP_CODE);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);

  const submit = () => {
    const res = joinShopStaff({
      code,
      name,
      phone,
      avatarDataUrl: avatar,
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t("staff.joined"));
    void navigate({ to: "/" });
  };

  return (
    <div
      className="mx-auto flex min-h-svh w-full max-w-lg flex-col bg-bg px-4"
      style={{ paddingTop: "calc(var(--grok-banner-h, 2.75rem) + 0.75rem)" }}
    >
      <h1 className="text-[1.45rem] font-bold tracking-tight text-fg">
        {t("staff.joinTitle")}
      </h1>
      <p className="mt-1 text-[13px] leading-relaxed text-muted">{t("staff.joinSub")}</p>
      <p className="mt-2 rounded-[var(--radius-md)] bg-elevated px-3 py-2 text-[12px] text-muted">
        {t("staff.demoCode", { code: shopCode })}
      </p>

      <div className="mt-4 space-y-3">
        <div className="grid gap-1.5">
          <Label>{t("staff.enterCode")}</Label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={DEMO_SHOP_CODE}
            autoCapitalize="characters"
            className="font-mono tracking-[0.12em]"
          />
        </div>
        <div className="grid gap-1.5">
          <Label>{t("on.name")}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label>{t("on.phone")}</Label>
          <Input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <ImageCapture
          value={avatar}
          onChange={setAvatar}
          label={t("staff.photo")}
          capture="user"
          hint={t("staff.photoHint")}
          cameraLabel={t("staff.capture")}
          galleryLabel={t("staff.gallery")}
        />
      </div>

      <div className="mt-auto space-y-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        <Button className="h-12 w-full" onClick={submit}>
          {t("staff.joinBtn")}
        </Button>
        <Button variant="outline" className="h-11 w-full" onClick={() => void navigate({ to: "/" })}>
          {t("common.back")}
        </Button>
      </div>
    </div>
  );
}
