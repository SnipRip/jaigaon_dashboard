"use client";

import { Plus, Trash2 } from "lucide-react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { resolveItemDefaults, type ItemCatalog } from "@/features/items/item-rules";
import { itemsInStock, stockIn } from "@/features/items/item-stock";
import { formatQuantity, formatRate } from "@/lib/format";
import { emptyStockLine, type StockLineValues } from "./stock-line-schema";

interface StockLinesCardProps {
  catalog: ItemCatalog;
  /** The godown stock leaves from, or (adding) the one it is added to. */
  godownId: string;
  godownName?: string;
  /** Adding stock: every item is listed and each line takes a rate. Otherwise only items held in the godown. */
  adding: boolean;
  /** One line about how the value is worked out, under the lines. */
  valueHint: string;
}

// The item lines of a transfer or adjustment, inside the form's
// FormProvider. Taking stock out lists only what the godown holds and shows
// how much is there; the backend refuses more than that.
export function StockLinesCard({ catalog, godownId, godownName, adding, valueHint }: StockLinesCardProps) {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useFormContext<{ lines: StockLineValues[] }>();
  const lineFields = useFieldArray({ control, name: "lines" });
  const lines = useWatch({ control, name: "lines" });
  const keepIds = (lines ?? []).map((line) => line.itemId).filter(Boolean);
  const listed = adding || !godownId ? catalog.items : itemsInStock(catalog.items, godownId, keepIds);
  const itemOptions = listed.map((item) => ({ value: item.id, label: `${item.name} · ${item.sku}` }));
  const errorText = (message?: string) => message && <p className="text-xs font-semibold text-danger-strong">{message}</p>;

  return (
    <GlassCard className="flex flex-col gap-3.5">
      <CardTitle>Items</CardTitle>
      {!adding && godownId && (
        <p className="text-xs font-semibold text-muted">
          Listing items in stock at {godownName ?? "the godown"}.{listed.length === 0 && " It holds nothing yet."}
        </p>
      )}
      {errorText(errors.lines?.root?.message ?? errors.lines?.message)}
      {lineFields.fields.map((field, index) => {
        const item = catalog.items.find((candidate) => candidate.id === lines?.[index]?.itemId);
        const unit = item ? (resolveItemDefaults(catalog, item).unit.value ?? "") : "";
        const held = item && godownId ? stockIn(item, godownId) : undefined;
        const quantity = Number(lines?.[index]?.quantity) || 0;
        const suggested = item?.stockCost ?? item?.lastLandedCost;
        const lineErrors = errors.lines?.[index];
        return (
          <div key={field.id} className="glass-inset flex flex-col gap-2.5 rounded-(--radius-tile) p-3">
            <div className={`grid items-start gap-2.5 ${adding ? "@2xl:grid-cols-[minmax(0,3fr)_1fr_1fr_auto]" : "@2xl:grid-cols-[minmax(0,3fr)_1fr_auto]"}`}>
              <div className="flex flex-col gap-1.5">
                <Controller
                  control={control}
                  name={`lines.${index}.itemId`}
                  render={({ field: itemField }) => (
                    <SelectField
                      label="Item"
                      options={itemOptions}
                      value={itemField.value || undefined}
                      onValueChange={(value) => setValue(`lines.${index}.itemId`, value, { shouldValidate: true })}
                    />
                  )}
                />
                {errorText(lineErrors?.itemId?.message)}
              </div>
              <TextField label={`Quantity${unit ? ` (${unit})` : ""}`} inputMode="decimal" error={lineErrors?.quantity?.message} {...register(`lines.${index}.quantity`)} />
              {adding && <TextField label="Cost per unit (₹)" inputMode="decimal" error={lineErrors?.rate?.message} {...register(`lines.${index}.rate`)} />}
              <Button
                variant="neutral"
                aria-label="Remove this line"
                disabled={lineFields.fields.length === 1}
                onClick={() => lineFields.remove(index)}
                className="w-11 px-0 @2xl:mt-[22px]"
              >
                <Trash2 aria-hidden="true" className="size-[18px]" />
              </Button>
            </div>
            {item && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-muted">
                {held !== undefined && (
                  <span className={!adding && quantity > held ? "text-danger-strong" : undefined}>
                    Stock {formatQuantity(held)} {unit} in {godownName ?? "the godown"}
                  </span>
                )}
                {adding && suggested !== undefined && (
                  <button type="button" className="text-brand hover:underline" onClick={() => setValue(`lines.${index}.rate`, String(suggested), { shouldValidate: true })}>
                    Use {formatRate(suggested)} ({item.stockCost !== undefined ? "its stock cost" : "last landed cost"})
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
      <Button variant="outline" onClick={() => lineFields.append(emptyStockLine)} className="self-start">
        <Plus aria-hidden="true" className="size-[18px]" />
        Add an item
      </Button>
      <p className="text-xs font-semibold text-muted">{valueHint}</p>
    </GlassCard>
  );
}
