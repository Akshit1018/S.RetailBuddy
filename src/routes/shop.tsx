import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, MapPin, Minus, Phone, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageCapture } from "@/components/image-capture";
import { useStockStore } from "@/lib/store";
import {
  buildOrderWhatsAppText,
  encodeOrder,
  shopPageUrl,
} from "@/lib/shop-order";
import { formatINR } from "@/lib/utils";
import { openWhatsApp } from "@/lib/whatsapp";
import { extractShoppingListFromImage, hashString } from "@/lib/ocr";
import {
  demoListFromCatalog,
  matchListToCatalog,
  parseListText,
} from "@/lib/list-ocr";

export const Route = createFileRoute("/shop")({
  component: PublicShopPage,
});

type CartLine = {
  code: string;
  name: string;
  price: number;
  qty: number;
};

function PublicShopPage() {
  const shop = useStockStore((s) => s.shop);
  const products = useStockStore((s) => s.products);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [fulfill, setFulfill] = useState<"pickup" | "delivery">("pickup");
  const [q, setQ] = useState("");
  const [listBusy, setListBusy] = useState(false);

  const catalog = useMemo(() => {
    let list = products.filter((p) =>
      shop.showOutOfStock ? true : p.quantity > 0,
    );
    const t = q.trim().toLowerCase();
    if (t) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(t) ||
          p.code.toLowerCase().includes(t),
      );
    }
    return list;
  }, [products, shop.showOutOfStock, q]);

  const bump = (p: { code: string; name: string; price: number }, d: number) => {
    setCart((prev) => {
      const hit = prev.find((c) => c.code === p.code);
      if (!hit) return d > 0 ? [...prev, { ...p, qty: 1 }] : prev;
      const qty = hit.qty + d;
      if (qty <= 0) return prev.filter((c) => c.code !== p.code);
      return prev.map((c) => (c.code === p.code ? { ...c, qty } : c));
    });
  };

  const applyListPhoto = async (dataUrl: string) => {
    setListBusy(true);
    try {
      const extracted = await extractShoppingListFromImage(dataUrl);
      const guesses = extracted.text
        ? parseListText(extracted.text)
        : demoListFromCatalog(products, hashString(dataUrl.slice(0, 800)));
      const matched = matchListToCatalog(guesses, products);
      let n = 0;
      for (const row of matched) {
        if (!row.product) continue;
        for (let i = 0; i < row.qty; i++) {
          bump(
            {
              code: row.product.code,
              name: row.product.name,
              price: row.product.unitPrice,
            },
            1,
          );
        }
        n++;
      }
      if (n) toast.success(`${n} items from your list`);
      else toast.message("Could not read the list — add by tap");
    } catch {
      toast.error("Could not read list photo");
    } finally {
      setListBusy(false);
    }
  };

  const total = cart.reduce((s, c) => s + c.qty * c.price, 0);
  const wa = (shop.whatsapp || shop.phone).replace(/\D/g, "");

  const send = () => {
    if (!cart.length) {
      toast.error("Add items first");
      return;
    }
    if (!name.trim()) {
      toast.error("Your name please");
      return;
    }
    const payload = {
      v: 1 as const,
      name: name.trim(),
      phone: phone.trim(),
      note: note.trim(),
      fulfill,
      lines: cart.map((c) => ({
        productCode: c.code,
        productName: c.name,
        quantity: c.qty,
        unitPrice: c.price,
      })),
      total,
    };
    const token = encodeOrder(payload);
    const text = buildOrderWhatsAppText({
      shopName: shop.name,
      payload,
      token,
    });
    const digits = wa.length === 10 ? `91${wa}` : wa;
    if (!digits) {
      toast.error("Shop WhatsApp not set");
      return;
    }
    openWhatsApp(
      `https://wa.me/${digits}?text=${encodeURIComponent(text)}`,
    );
    toast.success("WhatsApp opening with your order");
  };

  return (
    <div className="min-h-svh bg-bg">
      <div
        className="relative overflow-hidden px-4 pb-8 pt-10 text-white"
        style={{
          background: `linear-gradient(160deg, hsl(${shop.coverHue} 62% 42%), hsl(${shop.coverHue} 55% 28%))`,
          paddingTop: "calc(var(--grok-banner-h, 0px) + 2.2rem)",
        }}
      >
        <div className="mx-auto flex max-w-lg items-start gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/15 ring-1 ring-white/25">
            {shop.logoDataUrl ? (
              <img
                src={shop.logoDataUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold">
                {shop.name.trim().charAt(0) || "S"}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/70">
              Shop
            </p>
            <h1 className="truncate text-2xl font-bold leading-tight">
              {shop.name}
            </h1>
            <p className="mt-0.5 text-sm text-white/80">{shop.tagline}</p>
          </div>
        </div>
        <div className="mx-auto mt-4 flex max-w-lg flex-wrap gap-2 text-[12px] text-white/85">
          {shop.address ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/15 px-2.5 py-1">
              <MapPin className="size-3" />
              {shop.address}
              {shop.city ? `, ${shop.city}` : ""}
            </span>
          ) : null}
          {shop.hours ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/15 px-2.5 py-1">
              <Clock className="size-3" />
              {shop.hours}
            </span>
          ) : null}
        </div>
        {shop.about ? (
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/80">
            {shop.about}
          </p>
        ) : null}
      </div>

      <div className="mx-auto max-w-lg space-y-3 px-3 pb-36 pt-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products…"
        />
        <ImageCapture
          onChange={(url) => void applyListPhoto(url)}
          label="Photo of your shopping list"
        />
        {listBusy ? (
          <p className="text-center text-sm text-primary">Reading list…</p>
        ) : null}

        {catalog.length === 0 ? (
          <p className="rounded-[var(--radius-xl)] border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
            Catalogue is empty right now.
          </p>
        ) : (
          <ul className="space-y-2">
            {catalog.map((p) => {
              const qty = cart.find((c) => c.code === p.code)?.qty ?? 0;
              return (
                <li
                  key={p.id}
                  className="flex items-center gap-3 rounded-[var(--radius-xl)] bg-surface px-3 py-2.5 shadow-[var(--shadow-card)]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-fg">
                      {p.name}
                    </p>
                    <p className="text-[11px] text-muted">
                      {shop.showPrices ? formatINR(p.unitPrice) : "Ask shop"}
                      {p.quantity <= 0 ? " · out of stock" : ""}
                    </p>
                  </div>
                  {p.quantity <= 0 ? (
                    <span className="text-[11px] text-muted">—</span>
                  ) : qty === 0 ? (
                    <Button
                      size="sm"
                      onClick={() =>
                        bump(
                          { code: p.code, name: p.name, price: p.unitPrice },
                          1,
                        )
                      }
                    >
                      Add
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-9 w-9"
                        onClick={() =>
                          bump(
                            { code: p.code, name: p.name, price: p.unitPrice },
                            -1,
                          )
                        }
                      >
                        <Minus className="size-4" />
                      </Button>
                      <span className="w-6 text-center tabular text-sm font-semibold">
                        {qty}
                      </span>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-9 w-9"
                        onClick={() =>
                          bump(
                            { code: p.code, name: p.name, price: p.unitPrice },
                            1,
                          )
                        }
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <p className="px-1 text-center text-[11px] text-subtle">
          Staff view · <Link to="/" className="underline">Home</Link> ·{" "}
          {shopPageUrl()}
        </p>
      </div>

      {cart.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-3 py-3 backdrop-blur-md">
          <div className="mx-auto max-w-lg space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="WhatsApp no."
                inputMode="tel"
              />
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setFulfill("pickup")}
                className={`h-9 flex-1 rounded-full text-xs font-semibold ${
                  fulfill === "pickup"
                    ? "bg-fg text-bg"
                    : "bg-muted-surface text-muted"
                }`}
              >
                Pickup
              </button>
              <button
                type="button"
                onClick={() => setFulfill("delivery")}
                className={`h-9 flex-1 rounded-full text-xs font-semibold ${
                  fulfill === "delivery"
                    ? "bg-fg text-bg"
                    : "bg-muted-surface text-muted"
                }`}
              >
                Delivery
              </button>
            </div>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional)"
            />
            <Button className="h-12 w-full gap-2 text-base" onClick={send}>
              <ShoppingBag className="size-4" />
              Order now · {formatINR(total)}
            </Button>
            {wa ? (
              <a
                href={`https://wa.me/${wa.length === 10 ? `91${wa}` : wa}`}
                className="flex h-10 items-center justify-center gap-2 text-sm font-medium text-success"
              >
                <Phone className="size-3.5" />
                Chat shop on WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
