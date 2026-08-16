import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FileText, Keyboard, Loader2, Sparkles, Table2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageGuide } from "@/components/page-guide";
import { CatalogPick } from "@/components/catalog-pick";
import { ImageCapture } from "@/components/image-capture";
import { LineItemsTable } from "@/components/line-items-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  buildDemoInvoice,
  emptyInvoiceDraft,
  extractInvoiceFromImage,
  extractInvoiceFromText,
  renderPracticeInvoicePng,
  type OcrResult,
} from "@/lib/ocr";
import { simulateWeakLight } from "@/lib/image-prep";
import { useActiveProfile, useStockStore } from "@/lib/store";
import type { LineItem, Product } from "@/lib/types";
import { canStockIn, formatINR, uid } from "@/lib/utils";
import { RoleGate } from "@/components/role-lock";
import { useT } from "@/lib/i18n-context";

export const Route = createFileRoute("/stock-in")({
  component: StockInPage,
});

function lineFromProduct(p: Product): LineItem {
  return {
    id: uid("line"),
    productCode: p.code,
    productName: p.name,
    quantity: 1,
    unitCost: p.unitCost,
    unitPrice: p.unitPrice,
    mrp: p.mrp,
    expiryDate: p.expiryDate,
    batchNo: p.batchNo,
    codeGenerated: false,
    hsn: p.hsn,
    gstRate: p.gstRate,
  };
}

function StockInPage() {
  const navigate = useNavigate();
  const { t } = useT();
  const submitStockIn = useStockStore((s) => s.submitStockIn);
  const products = useStockStore((s) => s.products);
  const profile = useActiveProfile();

  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [ocr, setOcr] = useState<OcrResult | null>(null);
  const [lines, setLines] = useState<LineItem[]>([]);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [supplier, setSupplier] = useState("");
  const [billDate, setBillDate] = useState("");
  const [view, setView] = useState<"table" | "text">("table");
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const applyResult = (result: OcrResult, photo?: string | null) => {
    setOcr(result);
    setLines(result.lines);
    setInvoiceNo(result.invoiceNo ?? "");
    setSupplier(result.supplier ?? "");
    setBillDate(result.billDate ?? "");
    if (photo !== undefined) setImage(photo);
    if (result.lines.length) {
      toast.success(`${result.lines.length} lines ready — check qty & rate`);
    } else {
      toast.message(result.note || "Add rows by hand");
    }
  };

  const ensureEditor = () => {
    if (!ocr && lines.length === 0) {
      const draft = emptyInvoiceDraft();
      setOcr(draft);
      setLines(draft.lines);
      setBillDate(draft.billDate ?? "");
    }
  };

  const runOcr = async (dataUrl: string) => {
    setImage(dataUrl);
    setBusy(true);
    setProgress("Starting…");
    try {
      const result = await extractInvoiceFromImage(
        dataUrl,
        setProgress,
        products,
      );
      applyResult(result, dataUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "OCR failed");
      ensureEditor();
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  const loadSample = () => {
    applyResult(buildDemoInvoice(Date.now()), null);
  };

  const loadPracticePhoto = async (light: "day" | "shop" | "night" | "torch" = "day") => {
    const png = renderPracticeInvoicePng();
    if (!png) {
      toast.error("Could not draw a practice bill on this device");
      return;
    }
    const photo = light === "day" ? png : await simulateWeakLight(png, light);
    await runOcr(photo);
  };

  const applyPaste = () => {
    const text = pasteText.trim();
    if (!text) {
      toast.error("Paste or type some bill text first");
      return;
    }
    applyResult(extractInvoiceFromText(text, products), null);
  };

  const addProduct = (p: Product) => {
    ensureEditor();
    setLines((prev) => {
      const existing = prev.find(
        (l) => l.productCode.toLowerCase() === p.code.toLowerCase(),
      );
      if (existing) {
        return prev.map((l) =>
          l.id === existing.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      const blank = prev.filter((l) => !l.productName.trim());
      const keep = prev.filter((l) => l.productName.trim());
      return [...keep, lineFromProduct(p), ...blank];
    });
    toast.success(`Added ${p.name}`);
  };

  const total = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);
  const editing = Boolean(ocr || lines.length > 0);

  const submit = () => {
    if (!profile || !canStockIn(profile.roles)) {
      toast.error("Active profile needs a role to stock-in");
      return;
    }
    const ready = lines.filter((l) => l.productName.trim());
    if (ready.length === 0) {
      toast.error("Add at least one product name");
      return;
    }
    const res = submitStockIn({
      invoiceNo: invoiceNo || null,
      supplier: supplier || null,
      billDate: billDate || null,
      imageDataUrl: image,
      rawText: ocr?.rawText ?? null,
      lines: ready,
    });
    if (!res.ok) {
      if (res.duplicateId) {
        toast.error(res.error);
        void navigate({ to: "/review", search: { id: res.duplicateId } });
        return;
      }
      toast.error(res.error);
      return;
    }
    toast.success(`Stock added by ${profile.name} · verification pending`);
    void navigate({ to: "/review", search: { id: res.id } });
  };

  return (
    <AppShell title={t("stockIn.title")} subtitle={t("stockIn.subtitle")}>
      <RoleGate need="stock_in">
      <div className="space-y-3.5 fade-in">
        <PageGuide text={t("guide.stockIn")} />
        <Card className="border-0">
          <CardContent className="space-y-3 py-4">
            <ImageCapture
              value={image}
              onChange={(url) => void runOcr(url)}
              label={t("stockIn.capture")}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="secondary"
                className="h-11 w-full"
                onClick={() => setShowPaste((v) => !v)}
                disabled={busy}
              >
                <FileText className="size-4" />
                Paste
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-11 w-full"
                onClick={() => applyResult(emptyInvoiceDraft(), undefined)}
                disabled={busy}
              >
                <Keyboard className="size-4" />
                Type
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full"
                onClick={loadSample}
                disabled={busy}
              >
                {t("stockIn.sample")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full"
                onClick={() => void loadPracticePhoto("day")}
                disabled={busy}
              >
                Try OCR
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="h-11 w-full"
              data-testid="ocr-dim"
              onClick={() => void loadPracticePhoto("shop")}
              disabled={busy}
            >
              {t("stockIn.dim")}
            </Button>
            <button
              type="button"
              className="sr-only"
              data-testid="ocr-night"
              onClick={() => void loadPracticePhoto("night")}
              disabled={busy}
            >
              Night test
            </button>
            <button
              type="button"
              className="sr-only"
              data-testid="ocr-torch"
              onClick={() => void loadPracticePhoto("torch")}
              disabled={busy}
            >
              Torch test
            </button>
            {showPaste ? (
              <div className="space-y-2">
                <Label htmlFor="paste-bill">{t("stockIn.pasteHint")}</Label>
                <Textarea
                  id="paste-bill"
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={"Amul Taaza Toned Milk 1L  24  52\nTata Salt  40  22\nMaggi  96  12"}
                />
                <Button
                  type="button"
                  className="h-11 w-full"
                  onClick={applyPaste}
                  disabled={busy}
                >
                  {t("stockIn.pasteGo")}
                </Button>
              </div>
            ) : null}
            {busy ? (
              <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-primary/10 px-3 py-2 text-sm text-primary">
                <Loader2 className="size-4 animate-spin" />
                {progress || "Processing…"}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {editing ? (
          <>
            {ocr ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="default">
                  <Sparkles className="mr-1 size-3" />
                  {Math.round(ocr.confidence * 100)}% read
                </Badge>
                <Badge variant="muted">
                  {ocr.source === "demo"
                    ? "Sample"
                    : ocr.source === "paste"
                      ? "Pasted text"
                      : "Live OCR"}
                </Badge>
                <div className="ml-auto flex rounded-[var(--radius-md)] border border-border bg-elevated p-0.5">
                  <button
                    type="button"
                    className={`flex items-center gap-1 rounded-[calc(var(--radius-md)-2px)] px-2.5 py-1.5 text-xs font-medium ${
                      view === "table"
                        ? "bg-primary text-primary-fg"
                        : "text-muted"
                    }`}
                    onClick={() => setView("table")}
                  >
                    <Table2 className="size-3.5" />
                    Table
                  </button>
                  <button
                    type="button"
                    className={`flex items-center gap-1 rounded-[calc(var(--radius-md)-2px)] px-2.5 py-1.5 text-xs font-medium ${
                      view === "text"
                        ? "bg-primary text-primary-fg"
                        : "text-muted"
                    }`}
                    onClick={() => setView("text")}
                  >
                    <FileText className="size-3.5" />
                    Text
                  </button>
                </div>
              </div>
            ) : null}

            {ocr?.note ? (
              <p className="rounded-[var(--radius-lg)] bg-elevated px-3 py-2 text-xs leading-relaxed text-muted">
                {ocr.note}
              </p>
            ) : null}

            <Card className="border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Bill details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="inv">Invoice no.</Label>
                  <Input
                    id="inv"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="sup">Supplier / company</Label>
                  <Input
                    id="sup"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="Who did you buy from?"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="dt">Bill date</Label>
                  <Input
                    id="dt"
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t("stockIn.pickStock")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-xs text-muted">{t("stockIn.pickHint")}</p>
                <CatalogPick products={products} onAdd={addProduct} />
              </CardContent>
            </Card>

            {view === "text" && ocr ? (
              <Card className="border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t("stockIn.raw")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-[var(--radius-md)] bg-bg p-3 font-mono text-xs text-muted">
                    {ocr.rawText || "(no text)"}
                  </pre>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                <h2 className="text-sm font-medium text-muted">
                  Line items ({lines.filter((l) => l.productName.trim()).length})
                </h2>
                <LineItemsTable lines={lines} onChange={setLines} editable />
              </div>
            )}

            <div className="sticky-above-dock">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted">{t("home.purchase")}</span>
                <span className="font-semibold tabular">{formatINR(total)}</span>
              </div>
              <Button
                size="lg"
                className="h-12 w-full"
                onClick={submit}
                disabled={busy || lines.every((l) => !l.productName.trim())}
              >
                {t("stockIn.add")}
              </Button>
            </div>
          </>
        ) : null}
      </div>
      </RoleGate>
    </AppShell>
  );
}
