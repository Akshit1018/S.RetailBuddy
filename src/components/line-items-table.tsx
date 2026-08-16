import { Minus, Plus, Trash2 } from "lucide-react";
import type { LineItem } from "@/lib/types";
import { formatINR, generateProductCode, uid } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LineItemsTable({
  lines,
  onChange,
  editable = true,
  showPrice = true,
  mode = "stock_in",
}: {
  lines: LineItem[];
  onChange?: (lines: LineItem[]) => void;
  editable?: boolean;
  showPrice?: boolean;
  mode?: "stock_in" | "stock_out";
}) {
  const update = (id: string, patch: Partial<LineItem>) => {
    if (!onChange) return;
    onChange(
      lines.map((l) => {
        if (l.id !== id) return l;
        const next = { ...l, ...patch };
        if (patch.productName && (!l.productCode || l.codeGenerated)) {
          // keep generated code stable unless name empty
        }
        return next;
      }),
    );
  };

  const setQty = (id: string, qty: number) => {
    update(id, { quantity: Math.max(0, Math.floor(qty) || 0) });
  };

  const remove = (id: string) => {
    onChange?.(lines.filter((l) => l.id !== id));
  };

  const addEmpty = () => {
    onChange?.([
      ...lines,
      {
        id: uid("line"),
        productCode: generateProductCode("New Product"),
        productName: "",
        quantity: 1,
        unitCost: 0,
        unitPrice: 0,
        codeGenerated: true,
        expiryDate: null,
        batchNo: null,
        mrp: null,
      },
    ]);
  };

  if (lines.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-dashed border-border-strong bg-elevated/40 px-4 py-8 text-center">
        <p className="text-sm text-muted">No line items yet.</p>
        {editable ? (
          <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={addEmpty}>
            Add row
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {lines.map((line, idx) => (
        <div
          key={line.id}
          className="rounded-[var(--radius-lg)] border border-border bg-elevated/50 p-3"
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted-surface text-[11px] font-medium text-muted tabular">
                {idx + 1}
              </span>
              {line.codeGenerated ? (
                <Badge variant="info">Code auto</Badge>
              ) : (
                <Badge variant="muted">Vendor code</Badge>
              )}
            </div>
            {editable ? (
              <button
                type="button"
                onClick={() => remove(line.id)}
                className="rounded-[var(--radius-sm)] p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                aria-label="Remove line"
              >
                <Trash2 className="size-4" />
              </button>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Field label="Product code">
              {editable ? (
                <Input
                  value={line.productCode}
                  onChange={(e) =>
                    update(line.id, {
                      productCode: e.target.value,
                      codeGenerated: false,
                    })
                  }
                  className="font-mono text-xs"
                />
              ) : (
                <Value mono>{line.productCode}</Value>
              )}
            </Field>
            <Field label="Product name">
              {editable ? (
                <Input
                  value={line.productName}
                  onChange={(e) => update(line.id, { productName: e.target.value })}
                />
              ) : (
                <Value>{line.productName}</Value>
              )}
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Quantity">
                {editable ? (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="h-11 w-11 shrink-0"
                      onClick={() => setQty(line.id, line.quantity - 1)}
                    >
                      <Minus className="size-4" />
                    </Button>
                    <Input
                      type="number"
                      min={0}
                      value={line.quantity}
                      onChange={(e) => setQty(line.id, Number(e.target.value))}
                      className="text-center tabular"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="h-11 w-11 shrink-0"
                      onClick={() => setQty(line.id, line.quantity + 1)}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <Value tabular>{line.quantity}</Value>
                )}
              </Field>
              <Field label={mode === "stock_out" ? "Sell price" : "Unit cost"}>
                {editable ? (
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={mode === "stock_out" ? line.unitPrice : line.unitCost}
                    onChange={(e) =>
                      mode === "stock_out"
                        ? update(line.id, { unitPrice: Number(e.target.value) })
                        : update(line.id, { unitCost: Number(e.target.value) })
                    }
                    className="tabular"
                  />
                ) : (
                  <Value tabular>
                    {formatINR(mode === "stock_out" ? line.unitPrice : line.unitCost)}
                  </Value>
                )}
              </Field>
            </div>

            {mode === "stock_in" ? (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Expiry">
                  {editable ? (
                    <Input
                      type="date"
                      value={line.expiryDate ?? ""}
                      onChange={(e) =>
                        update(line.id, { expiryDate: e.target.value || null })
                      }
                    />
                  ) : (
                    <Value>{line.expiryDate || "—"}</Value>
                  )}
                </Field>
                <Field label="Batch">
                  {editable ? (
                    <Input
                      value={line.batchNo ?? ""}
                      onChange={(e) =>
                        update(line.id, { batchNo: e.target.value || null })
                      }
                    />
                  ) : (
                    <Value>{line.batchNo || "—"}</Value>
                  )}
                </Field>
              </div>
            ) : null}

            {mode === "stock_in" ? (
              <div className="grid grid-cols-2 gap-2">
                <Field label="HSN">
                  {editable ? (
                    <Input
                      value={line.hsn ?? ""}
                      onChange={(e) =>
                        update(line.id, { hsn: e.target.value || null })
                      }
                    />
                  ) : (
                    <Value mono>{line.hsn || "—"}</Value>
                  )}
                </Field>
                <Field label="GST %">
                  {editable ? (
                    <Input
                      type="number"
                      min={0}
                      value={line.gstRate ?? 5}
                      onChange={(e) =>
                        update(line.id, { gstRate: Number(e.target.value) })
                      }
                      className="tabular"
                    />
                  ) : (
                    <Value tabular>{line.gstRate ?? 5}%</Value>
                  )}
                </Field>
              </div>
            ) : null}

            {showPrice && mode === "stock_in" ? (
              <Field label="Sell price (per unit)">
                {editable ? (
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.unitPrice}
                    onChange={(e) =>
                      update(line.id, { unitPrice: Number(e.target.value) })
                    }
                    className="tabular"
                  />
                ) : (
                  <Value tabular>{formatINR(line.unitPrice)}</Value>
                )}
              </Field>
            ) : null}

            <div className="flex justify-between border-t border-border pt-2 text-xs text-muted">
              <span>Line total</span>
              <span className="font-medium text-fg tabular">
                {formatINR(
                  line.quantity *
                    (mode === "stock_out" ? line.unitPrice : line.unitCost),
                )}
              </span>
            </div>
          </div>
        </div>
      ))}

      {editable ? (
        <Button type="button" variant="outline" className="w-full" onClick={addEmpty}>
          Add product row
        </Button>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-subtle">
        {label}
      </span>
      {children}
    </label>
  );
}

function Value({
  children,
  mono,
  tabular,
}: {
  children: React.ReactNode;
  mono?: boolean;
  tabular?: boolean;
}) {
  return (
    <div
      className={`rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2.5 text-sm text-fg ${
        mono ? "font-mono text-xs" : ""
      } ${tabular ? "tabular" : ""}`}
    >
      {children}
    </div>
  );
}
