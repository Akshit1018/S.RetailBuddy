import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Barcode,
  ChevronDown,
  ChevronUp,
  Loader2,
  Minus,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/app-shell";
import { PageGuide } from "@/components/page-guide";
import { HelpTip } from "@/components/help-tip";
import { ImageCapture } from "@/components/image-capture";
import { CatalogPick } from "@/components/catalog-pick";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  extractInvoiceFromImage,
  extractInvoiceFromText,
  extractShoppingListFromImage,
  identifyProductFromImage,
} from "@/lib/ocr";
import {
  demoListText,
  matchListToCatalog,
  parseListText,
  type ListMatch,
} from "@/lib/list-ocr";
import { useActiveProfile, useStockStore } from "@/lib/store";
import type { SellMode } from "@/lib/types";
import { cn, formatINR, uid } from "@/lib/utils";
import { RoleGate } from "@/components/role-lock";
import { useT } from "@/lib/i18n-context";
import { useBarcodeWedge } from "@/components/barcode-wedge";
import { GstBlock } from "@/components/gst-block";
import { summarizeGst } from "@/lib/gst";
import { lookupBarcode } from "@/lib/public-apis";
import { creditCheck } from "@/lib/credit-limit";
import { VoiceRemark } from "@/components/voice-remark";
import { effectiveStaffPerms } from "@/lib/staff";
import { CollectPayCard } from "@/components/collect-pay";
import { enqueueSale, isOnline } from "@/lib/offline-queue";

const searchSchema = z.object({
  mode: z.enum(["bill", "product", "barcode", "list"]).catch("product"),
  q: z.string().optional().catch(""),
});

export const Route = createFileRoute("/sell")({
  validateSearch: searchSchema,
  component: SellPage,
});

interface CartLine {
  id: string;
  productId?: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  available: number;
}

function SellPage() {
  const { mode, q } = Route.useSearch();
  const navigate = useNavigate();
  const { t } = useT();
  const products = useStockStore((s) => s.products);
  const customers = useStockStore((s) => s.customers);
  const sales = useStockStore((s) => s.sales);
  const settings = useStockStore((s) => s.settings);
  const submitSale = useStockStore((s) => s.submitSale);
  const addCatalogProduct = useStockStore((s) => s.addCatalogProduct);
  const profile = useActiveProfile();
  const staffPerms = effectiveStaffPerms(profile);
  const maxDisc = staffPerms.discountMode === "none" ? 0 : staffPerms.discountMaxPct;

  const [cart, setCart] = useState<CartLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [billImage, setBillImage] = useState<string | null>(null);
  const [listImage, setListImage] = useState<string | null>(null);
  const [listRows, setListRows] = useState<ListMatch[]>([]);
  const [listText, setListText] = useState("");
  const [billNote, setBillNote] = useState("");
  const [billUnmatched, setBillUnmatched] = useState<
    Array<{ name: string; qty: number }>
  >([]);
  const [showBillPaste, setShowBillPaste] = useState(false);
  const [billPaste, setBillPaste] = useState("");
  const [productHints, setProductHints] = useState<
    Array<{ code: string; name: string; score: number }>
  >([]);
  const [productQuery, setProductQuery] = useState(q || "");
  const [manualCode, setManualCode] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html5QrRef = useRef<any>(null);
  const [scanActive, setScanActive] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState<string>("");
  const [showCustomer, setShowCustomer] = useState(false);
  const [custName, setCustName] = useState("");
  const [custWhatsapp, setCustWhatsapp] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custAddress, setCustAddress] = useState("");
  const [saveCustomer, setSaveCustomer] = useState(true);
  const [discountPct, setDiscountPct] = useState("");
  const [orderRemark, setOrderRemark] = useState("");
  const [voiceRemark, setVoiceRemark] = useState<string | null>(null);

  const selectCustomer = (id: string) => {
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    if (c) {
      setCustName(c.name);
      setCustWhatsapp(c.whatsapp || "");
      setCustPhone(c.phone || "");
      setCustAddress(c.address || "");
      setSaveCustomer(false);
      setShowCustomer(true);
    } else {
      setCustName("");
      setCustWhatsapp("");
      setCustPhone("");
      setCustAddress("");
      setSaveCustomer(true);
    }
  };

  const addOrBump = useCallback(
    (item: {
      productId?: string;
      productCode: string;
      productName: string;
      quantity?: number;
      unitPrice: number;
      unitCost: number;
      available: number;
    }) => {
      setCart((prev) => {
        const key = item.productId || item.productCode;
        const existing = prev.find(
          (c) => (c.productId || c.productCode) === key,
        );
        if (existing) {
          return prev.map((c) =>
            c.id === existing.id
              ? {
                  ...c,
                  quantity: c.quantity + (item.quantity ?? 1),
                }
              : c,
          );
        }
        return [
          ...prev,
          {
            id: uid("cart"),
            productId: item.productId,
            productCode: item.productCode,
            productName: item.productName,
            quantity: item.quantity ?? 1,
            unitPrice: item.unitPrice,
            unitCost: item.unitCost,
            available: item.available,
          },
        ];
      });
    },
    [],
  );

  const matchProduct = useCallback(
    (code: string) => {
      const c = code.trim().toLowerCase();
      return products.find(
        (p) =>
          p.code.toLowerCase() === c ||
          (p.barcode && p.barcode.toLowerCase() === c) ||
          p.name.toLowerCase() === c,
      );
    },
    [products],
  );

  const addByCode = useCallback(
    (code: string) => {
      const p = matchProduct(code);
      if (p) {
        addOrBump({
          productId: p.id,
          productCode: p.code,
          productName: p.name,
          quantity: 1,
          unitPrice: p.unitPrice,
          unitCost: p.unitCost,
          available: p.quantity,
        });
        toast.success(`Added ${p.name}`);
        setManualCode("");
        return;
      }
      void (async () => {
        try {
          const off = await lookupBarcode(code);
          if (!off) {
            toast.error(`No stock for code ${code}`);
            return;
          }
          const id = addCatalogProduct({
            name: off.brand ? `${off.brand} ${off.name}` : off.name,
            barcode: off.barcode,
            code: off.barcode,
            unitPrice: 0,
            quantity: 0,
          });
          addOrBump({
            productId: id,
            productCode: off.barcode,
            productName: off.name,
            quantity: 1,
            unitPrice: 0,
            unitCost: 0,
            available: 0,
          });
          toast.message(`${off.name} from Open Food Facts — set price`);
          setManualCode("");
        } catch {
          toast.error(`No stock for code ${code}`);
        }
      })();
    },
    [addOrBump, matchProduct, addCatalogProduct],
  );

  useBarcodeWedge((code) => addByCode(code), mode === "barcode");

  const applyListMatches = (matched: ListMatch[]) => {
    setListRows(matched);
    let added = 0;
    for (const row of matched) {
      if (!row.product) continue;
      addOrBump({
        productId: row.product.id,
        productCode: row.product.code,
        productName: row.product.name,
        quantity: row.qty,
        unitPrice: row.product.unitPrice,
        unitCost: row.product.unitCost,
        available: row.product.quantity,
      });
      added++;
    }
    if (added) toast.success(`${added} items from list → cart`);
    else toast.message("Nothing matched stock — pick each line below");
  };

  const applyTypedList = (text: string) => {
    const guesses = parseListText(text);
    if (!guesses.length) {
      toast.error("Type items like: 2 Maggi");
      return;
    }
    applyListMatches(matchListToCatalog(guesses, products));
  };

  const onListPhoto = async (dataUrl: string) => {
    setListImage(dataUrl);
    setBusy(true);
    try {
      const extracted = await extractShoppingListFromImage(dataUrl);
      if (!extracted.text.trim()) {
        toast.error(extracted.note || "Could not read list — type it instead");
        setListRows([]);
        return;
      }
      setListText(extracted.text);
      applyListMatches(matchListToCatalog(parseListText(extracted.text), products));
    } catch {
      toast.error("Could not read list — type it instead");
    } finally {
      setBusy(false);
    }
  };

  const applyBillResult = (result: {
    lines: Array<{ productCode: string; productName: string; quantity: number }>;
    note?: string;
  }) => {
    let added = 0;
    const unmatched: Array<{ name: string; qty: number }> = [];
    for (const line of result.lines) {
      const p =
        matchProduct(line.productCode) ||
        products.find(
          (x) => x.name.toLowerCase() === line.productName.toLowerCase(),
        );
      if (p) {
        addOrBump({
          productId: p.id,
          productCode: p.code,
          productName: p.name,
          quantity: line.quantity,
          unitPrice: p.unitPrice,
          unitCost: p.unitCost,
          available: p.quantity,
        });
        added++;
      } else {
        unmatched.push({ name: line.productName, qty: line.quantity });
      }
    }
    setBillUnmatched(unmatched);
    setBillNote(result.note || "");
    if (added) toast.success(`${added} stock items added from bill`);
    else toast.message(result.note || "Bill read — pick matches below");
  };

  const onBillPhoto = async (dataUrl: string) => {
    setBillImage(dataUrl);
    setBusy(true);
    try {
      const result = await extractInvoiceFromImage(dataUrl, undefined, products);
      if (!result.lines.length) {
        toast.error(result.note || "No products found. Paste text or pick stock.");
        setBillNote(result.note || "");
        return;
      }
      applyBillResult(result);
    } catch {
      toast.error("Could not read bill. Paste the text or pick from stock.");
    } finally {
      setBusy(false);
    }
  };

  const onProductPhoto = async (dataUrl: string) => {
    setBusy(true);
    setProductHints([]);
    try {
      const hit = await identifyProductFromImage(
        dataUrl,
        products.map((p) => ({ code: p.code, name: p.name })),
      );
      setProductHints(hit.suggestions);
      const p = hit.code ? matchProduct(hit.code) : undefined;
      if (p) {
        addOrBump({
          productId: p.id,
          productCode: p.code,
          productName: p.name,
          quantity: 1,
          unitPrice: p.unitPrice,
          unitCost: p.unitCost,
          available: p.quantity,
        });
        toast.success(`Matched: ${p.name}`);
      } else {
        toast.message("No clear match — tap a product below");
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (mode !== "barcode") return;
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let scanner: any = null;

    async function start() {
      setScanError(null);
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const el = document.getElementById("barcode-reader");
        if (!el || cancelled) return;
        el.innerHTML = "";
        const instance = new Html5Qrcode("barcode-reader");
        scanner = instance;
        html5QrRef.current = instance;
        await instance.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: { width: 220, height: 110 } },
          (decoded: string) => {
            if (cancelled) return;
            addByCode(decoded);
          },
          () => {},
        );
        if (!cancelled) setScanActive(true);
      } catch (e) {
        if (!cancelled) {
          setScanError(
            e instanceof Error
              ? e.message
              : "Camera unavailable — use manual entry",
          );
          setScanActive(false);
        }
      }
    }

    void start();
    return () => {
      cancelled = true;
      setScanActive(false);
      html5QrRef.current = null;
      const s = scanner;
      if (!s) return;
      void (async () => {
        try {
          if (s.isScanning) await s.stop().catch(() => {});
        } catch {
          /* ignore */
        }
        try {
          s.clear();
        } catch {
          /* ignore */
        }
      })();
    };
  }, [mode, addByCode]);

  const setQty = (id: string, qty: number) => {
    setCart((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, quantity: Math.max(1, Math.floor(qty) || 1) } : c,
      ),
    );
  };

  const remove = (id: string) =>
    setCart((prev) => prev.filter((c) => c.id !== id));

  const total = cart.reduce((s, c) => s + c.quantity * c.unitPrice, 0);
  const profit = cart.reduce(
    (s, c) => s + c.quantity * (c.unitPrice - c.unitCost),
    0,
  );
  const discNum = Math.max(0, Math.min(maxDisc || 100, Number(discountPct) || 0));
  const payable =
    discNum > 0 ? Math.round(total * (1 - discNum / 100) * 100) / 100 : total;
  const gst = summarizeGst(
    cart.map((c) => ({
      quantity: c.quantity,
      unitPrice: c.unitPrice,
    })),
  );

  const submit = () => {
    if (!profile) {
      toast.error("Create a profile first");
      return;
    }
    if (cart.length === 0) {
      toast.error("Add products to sell first");
      return;
    }
    const selected = customers.find((c) => c.id === customerId);
    const check = creditCheck({
      customerId: customerId || null,
      creditLimit: selected?.creditLimit,
      cartTotal: payable,
      sales,
      enforce: settings.enforceCreditLimit,
      defaultLimit: settings.defaultCreditLimit,
    });
    if (!check.ok) {
      toast.error(check.message);
      return;
    }
    const payload = {
      mode: mode as SellMode,
      imageDataUrl: billImage,
      customerId: customerId || null,
      customerDraft: custName.trim()
        ? {
            name: custName.trim(),
            whatsapp: custWhatsapp.trim() || undefined,
            phone: custPhone.trim() || undefined,
            address: custAddress.trim() || undefined,
            save: saveCustomer && !customerId,
          }
        : null,
      lines: cart.map((c) => ({
        productId: c.productId,
        productCode: c.productCode,
        productName: c.productName,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
      })),
      discountPct: discountPct ? Number(discountPct) : 0,
      orderRemark: orderRemark.trim() || null,
      voiceRemarkDataUrl: voiceRemark,
    };
    if (settings.offlineQueueEnabled && !isOnline()) {
      enqueueSale(payload);
      toast.message(t("offline.queuedSale"));
      setCart([]);
      return;
    }
    const result = submitSale(payload);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Bill ${result.billNo} · sold by ${profile.name}`);
    setCart([]);
    setBillImage(null);
    void navigate({ to: "/bills/$saleId", params: { saleId: result.saleId } });
  };

  const titles: Record<SellMode, string> = {
    bill: t("sell.bill"),
    product: t("sell.product"),
    barcode: t("sell.barcode"),
    list: t("sell.list"),
  };

  return (
    <AppShell
      title={t("sell.title")}
      subtitle={t("sell.as", { name: profile?.name || "—" })}
      hideSell
    >
      <RoleGate need="sell">
      <div className="space-y-3.5 fade-in">
        <PageGuide text={t("guide.sell")} />
        {settings.shopKind === "pharmacy" ? (
          <p
            data-testid="fifo-hint"
            className="rounded-[var(--radius-md)] bg-warning/10 px-3 py-2 text-[12px] leading-snug text-fg"
          >
            {t("exp.fifo")}
          </p>
        ) : null}
        {/* Full-width mode switcher — mobile first */}
        <div className="grid grid-cols-2 gap-1.5">
          {(["bill", "product", "barcode", "list"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => void navigate({ to: "/sell", search: { mode: m } })}
              className={cn(
                "min-h-11 rounded-[var(--radius-md)] border px-1 py-2 text-center text-[11px] font-semibold leading-tight sm:text-xs",
                mode === m
                  ? "border-sell/40 bg-sell/15 text-sell"
                  : "border-border bg-surface text-muted",
              )}
            >
              {titles[m]}
            </button>
          ))}
        </div>
        <p className="text-center text-[11px] leading-relaxed text-muted">
          {mode === "product"
            ? t("sell.productHint")
            : mode === "list"
              ? t("sell.listTypeHint")
              : mode === "bill"
                ? t("sell.billHint")
                : t("sell.barcodeHint")}
        </p>

        <Card className="border-0">
          <button
            type="button"
            className="flex min-h-14 w-full items-center justify-between gap-2 px-3 py-3 text-left sm:px-4"
            onClick={() => setShowCustomer((v) => !v)}
            aria-expanded={showCustomer}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-fg">{t("sell.customer")}</p>
              <p className="truncate text-xs text-muted">
                {custName
                  ? `${custName}${custWhatsapp ? ` · ${custWhatsapp}` : ""}`
                  : t("sell.customerHint")}
              </p>
            </div>
            {showCustomer ? (
              <ChevronUp className="size-5 shrink-0 text-muted" />
            ) : (
              <ChevronDown className="size-5 shrink-0 text-muted" />
            )}
          </button>
          {showCustomer ? (
            <CardContent className="space-y-3 border-t border-border pt-3">
              <div className="grid gap-1.5">
                <Label htmlFor="cust-select">Saved customers</Label>
                <select
                  id="cust-select"
                  className="h-11 w-full rounded-[var(--radius-md)] border border-border bg-elevated px-3 text-base text-fg"
                  value={customerId}
                  onChange={(e) => selectCustomer(e.target.value)}
                >
                  <option value="">New / walk-in</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customerNo} · {c.name}
                      {c.whatsapp ? ` · ${c.whatsapp}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cust-name">Name</Label>
                <Input
                  id="cust-name"
                  value={custName}
                  onChange={(e) => {
                    setCustName(e.target.value);
                    if (customerId) setCustomerId("");
                  }}
                  placeholder="Customer name"
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="cust-wa">{t("sell.waNumber")}</Label>
                  <Input
                    id="cust-wa"
                    value={custWhatsapp}
                    onChange={(e) => setCustWhatsapp(e.target.value)}
                    inputMode="tel"
                    placeholder="WhatsApp"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="cust-phone">{t("on.phone")}</Label>
                  <Input
                    id="cust-phone"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    inputMode="tel"
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cust-addr">Address</Label>
                <Input
                  id="cust-addr"
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                />
              </div>
              {!customerId && custName.trim() ? (
                <label className="flex min-h-11 items-center gap-3 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={saveCustomer}
                    onChange={(e) => setSaveCustomer(e.target.checked)}
                    className="size-5 rounded border-border"
                  />
                  Save to customer list
                </label>
              ) : null}
            </CardContent>
          ) : null}
        </Card>

        {mode === "list" ? (
          <Card className="border-0">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm">{t("sell.listType")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs leading-relaxed text-muted">
                {t("sell.listTypeHint")}
              </p>
              <Textarea
                value={listText}
                onChange={(e) => setListText(e.target.value)}
                placeholder={"2 Maggi\n1 Tata salt\nAmul milk"}
              />
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  className="h-11 w-full"
                  onClick={() => applyTypedList(listText)}
                  disabled={busy}
                >
                  {t("sell.listAdd")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full"
                  onClick={() => {
                    const sample = demoListText(products);
                    setListText(sample);
                    applyTypedList(sample);
                  }}
                  disabled={busy}
                >
                  {t("sell.listSample")}
                </Button>
              </div>
              <div className="border-t border-border pt-3">
                <p className="mb-2 text-xs text-muted">{t("sell.listHint")}</p>
                <ImageCapture
                  value={listImage}
                  onChange={(url) => void onListPhoto(url)}
                  label={t("sell.listCapture")}
                />
              </div>
              {busy ? (
                <p className="flex items-center gap-2 text-sm text-primary">
                  <Loader2 className="size-4 animate-spin" /> {t("sell.listReading")}
                </p>
              ) : null}
              {listRows.length > 0 ? (
                <ul className="space-y-1.5">
                  {listRows.map((row, i) => (
                    <li
                      key={`${row.raw}-${i}`}
                      className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] bg-elevated px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate">
                        {row.qty} × {row.product?.name || row.query}
                        {!row.product ? (
                          <span className="ml-1 text-[11px] text-warning">
                            {t("sell.listMiss")}
                          </span>
                        ) : null}
                      </span>
                      {!row.product ? (
                        <select
                          className="h-9 max-w-[46%] rounded-md border border-border bg-surface px-1 text-xs"
                          defaultValue=""
                          onChange={(e) => {
                            const p = products.find((x) => x.id === e.target.value);
                            if (!p) return;
                            addOrBump({
                              productId: p.id,
                              productCode: p.code,
                              productName: p.name,
                              quantity: row.qty,
                              unitPrice: p.unitPrice,
                              unitCost: p.unitCost,
                              available: p.quantity,
                            });
                            toast.success(p.name);
                          }}
                        >
                          <option value="">{t("sell.listPick")}</option>
                          {products
                            .filter((p) => p.quantity > 0)
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                        </select>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {mode === "bill" ? (
          <Card className="border-0">
            <CardContent className="space-y-3 py-4">
              <p className="text-xs leading-relaxed text-muted">
                {t("sell.billHint")}
              </p>
              <ImageCapture
                value={billImage}
                onChange={(url) => void onBillPhoto(url)}
                label="Click photo of sale bill"
              />
              <Button
                type="button"
                variant="secondary"
                className="h-11 w-full"
                onClick={() => setShowBillPaste((v) => !v)}
              >
                {t("sell.billPaste")}
              </Button>
              {showBillPaste ? (
                <div className="space-y-2">
                  <Textarea
                    value={billPaste}
                    onChange={(e) => setBillPaste(e.target.value)}
                    placeholder={"2 Maggi\n1 Tata Salt\nAmul milk"}
                  />
                  <Button
                    type="button"
                    className="h-11 w-full"
                    onClick={() => {
                      const text = billPaste.trim();
                      if (!text) {
                        toast.error("Paste some bill text first");
                        return;
                      }
                      applyBillResult(extractInvoiceFromText(text, products));
                    }}
                  >
                    {t("stockIn.pasteGo")}
                  </Button>
                </div>
              ) : null}
              {busy ? (
                <p className="flex items-center gap-2 text-sm text-primary">
                  <Loader2 className="size-4 animate-spin" /> Reading…
                </p>
              ) : null}
              {billNote ? (
                <p className="rounded-[var(--radius-md)] bg-elevated px-3 py-2 text-xs text-muted">
                  {billNote}
                </p>
              ) : null}
              {billUnmatched.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-warning">
                    {t("sell.unmatched")}
                  </p>
                  {billUnmatched.map((row, i) => (
                    <div
                      key={`${row.name}-${i}`}
                      className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] bg-elevated px-3 py-2"
                    >
                      <span className="min-w-0 truncate text-sm">
                        {row.qty} × {row.name}
                      </span>
                      <select
                        className="h-9 max-w-[46%] rounded-md border border-border bg-surface px-1 text-xs"
                        defaultValue=""
                        onChange={(e) => {
                          const p = products.find((x) => x.id === e.target.value);
                          if (!p) return;
                          addOrBump({
                            productId: p.id,
                            productCode: p.code,
                            productName: p.name,
                            quantity: row.qty,
                            unitPrice: p.unitPrice,
                            unitCost: p.unitCost,
                            available: p.quantity,
                          });
                          toast.success(p.name);
                        }}
                      >
                        <option value="">{t("sell.listPick")}</option>
                        {products
                          .filter((p) => p.quantity > 0)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="border-t border-border pt-3">
                <p className="mb-2 text-xs text-muted">{t("stockIn.pickHint")}</p>
                <CatalogPick
                  products={products}
                  inStockOnly
                  onAdd={(p) =>
                    addOrBump({
                      productId: p.id,
                      productCode: p.code,
                      productName: p.name,
                      quantity: 1,
                      unitPrice: p.unitPrice,
                      unitCost: p.unitCost,
                      available: p.quantity,
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        ) : null}

        {mode === "product" ? (
          <Card className="border-0">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm">Search stock and add</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder="Search stock to add…"
              />
              <div className="max-h-52 space-y-1.5 overflow-auto">
                <p className="text-[11px] text-muted">{t("fefo.note")}</p>
                {products
                  .filter((p) => p.quantity > 0)
                  .filter((p) => {
                    const q = productQuery.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      p.name.toLowerCase().includes(q) ||
                      p.code.toLowerCase().includes(q)
                    );
                  })
                  .slice()
                  .sort((a, b) =>
                    (a.expiryDate || "9999").localeCompare(b.expiryDate || "9999"),
                  )
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        addOrBump({
                          productId: p.id,
                          productCode: p.code,
                          productName: p.name,
                          unitPrice: p.unitPrice,
                          unitCost: p.unitCost,
                          available: p.quantity,
                        })
                      }
                      className="flex min-h-12 w-full items-center justify-between rounded-[var(--radius-md)] border border-border bg-elevated px-3 py-2.5 text-left text-sm hover:bg-muted-surface active:scale-[0.99]"
                    >
                      <span className="min-w-0 truncate font-medium">
                        {p.name}
                      </span>
                      <span className="ml-2 shrink-0 text-xs text-muted tabular">
                        {p.quantity} left
                      </span>
                    </button>
                  ))}
              </div>
              <div className="border-t border-border pt-3">
                <p className="mb-2 text-xs text-muted">
                  Optional: snap a pack. We match the name against your stock.
                </p>
                <ImageCapture
                  onChange={(url) => void onProductPhoto(url)}
                  label="Click product photo"
                />
              </div>
              {busy ? (
                <p className="flex items-center gap-2 text-sm text-primary">
                  <Loader2 className="size-4 animate-spin" /> Identifying…
                </p>
              ) : null}
              {productHints.length ? (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-muted">
                    Closest matches
                  </p>
                  {productHints.map((h) => {
                    const p = products.find((x) => x.code === h.code);
                    if (!p) return null;
                    return (
                      <button
                        key={h.code}
                        type="button"
                        className="flex min-h-11 w-full items-center justify-between rounded-[var(--radius-md)] bg-elevated px-3 text-left text-sm"
                        onClick={() =>
                          addOrBump({
                            productId: p.id,
                            productCode: p.code,
                            productName: p.name,
                            quantity: 1,
                            unitPrice: p.unitPrice,
                            unitCost: p.unitCost,
                            available: p.quantity,
                          })
                        }
                      >
                        <span className="truncate">{p.name}</span>
                        <span className="text-[11px] text-muted">
                          {Math.round(h.score * 100)}%
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {mode === "barcode" ? (
          <Card>
            <CardContent className="space-y-3 py-4">
              <div
                id="barcode-reader"
                className="min-h-[140px] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-bg"
              />
              {scanActive ? (
                <Badge variant="success" className="gap-1">
                  <Barcode className="size-3" /> Scanner live
                </Badge>
              ) : null}
              {scanError ? (
                <p className="text-xs text-warning">{scanError}</p>
              ) : null}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Type barcode or SKU"
                  className="min-w-0 flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && manualCode.trim()) {
                      addByCode(manualCode.trim());
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full shrink-0 sm:w-auto"
                  onClick={() =>
                    manualCode.trim() && addByCode(manualCode.trim())
                  }
                >
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-muted">
              {t("sell.cart")} ({cart.length})
            </h2>
            <HelpTip tipKey="tip.sellFab" />
          </div>
          {cart.length === 0 ? (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-border-strong px-4 py-6 text-center text-sm text-muted">
              {t("sell.emptyCart")}
            </div>
          ) : (
            <ul className="space-y-2">
              {cart.map((c) => (
                <li key={c.id}>
                  <Card>
                    <CardContent className="space-y-2 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-fg">
                            {c.productName}
                          </p>
                          <p className="font-mono text-[11px] text-subtle">
                            {c.productCode}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(c.id)}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-muted hover:bg-danger/10 hover:text-danger"
                          aria-label="Remove"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          onClick={() => setQty(c.id, c.quantity - 1)}
                        >
                          <Minus className="size-4" />
                        </Button>
                        <Input
                          type="number"
                          min={1}
                          value={c.quantity}
                          onChange={(e) =>
                            setQty(c.id, Number(e.target.value))
                          }
                          className="min-w-0 flex-1 text-center tabular"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          onClick={() => setQty(c.id, c.quantity + 1)}
                        >
                          <Plus className="size-4" />
                        </Button>
                        <div className="ml-1 shrink-0 text-right">
                          <p className="text-sm font-semibold tabular">
                            {formatINR(c.quantity * c.unitPrice)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Card className="border-sell/30 bg-surface">
          <CardContent className="space-y-3 py-3">
            <GstBlock
              taxable={gst.taxable}
              cgst={gst.cgst}
              sgst={gst.sgst}
              total={total}
            />
            {maxDisc > 0 ? (
              <div className="grid gap-1.5">
                <Label>{t("staff.discount")} (max {maxDisc}%)</Label>
                <Input
                  inputMode="decimal"
                  value={discountPct}
                  onChange={(e) => setDiscountPct(e.target.value)}
                  placeholder="0"
                />
              </div>
            ) : null}
            <div className="grid gap-1.5">
              <Label>{t("staff.remark")}</Label>
              <Textarea
                value={orderRemark}
                onChange={(e) => setOrderRemark(e.target.value)}
                rows={2}
                placeholder={t("staff.remarkPh")}
              />
            </div>
            <VoiceRemark value={voiceRemark} onChange={setVoiceRemark} />
            <div className="flex justify-between text-sm">
              <span className="text-muted">{t("common.profit")}</span>
              <span className="font-semibold tabular text-success">
                {formatINR(profit)}
              </span>
            </div>
          </CardContent>
        </Card>
        {staffPerms.collectPay ? (
          <CollectPayCard
            amount={payable}
            defaultPhone={custWhatsapp || custPhone}
          />
        ) : null}
        <div className="sticky-above-dock">
          <Button
            type="button"
            variant="sell"
            size="lg"
            className="h-12 w-full"
            onClick={submit}
            disabled={cart.length === 0}
          >
            {t("sell.submit")} · {formatINR(payable)}
          </Button>
        </div>
      </div>
      </RoleGate>
    </AppShell>
  );
}
