"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { Button, buttonClasses } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { SelectField } from "@/components/ui/select-field";
import { StatusChip } from "@/components/ui/status-chip";
import { TextArea } from "@/components/ui/text-area";
import { TextField } from "@/components/ui/text-field";
import { describeComponents } from "@/features/gst/gst-rules";
import { invoiceTotals, lineTotals } from "@/features/invoices/invoice-rules";
import type { InvoiceLine } from "@/features/invoices/types";
import { itemLabel, type ItemCatalog } from "@/features/items/item-rules";
import { LineUnitSelect } from "@/features/items/line-unit-select";
import { conversionText, restateRate, typedLine } from "@/features/items/line-units";
import type { Godown } from "@/features/masters/types";
import type { Party } from "@/features/parties/types";
import { placeOf } from "@/features/parties/party-rules";
import { billTax, splitRegime } from "@/features/purchases/purchase-rules";
import { fetchLastRates, saveOrder } from "@/features/purchases/purchases-api";
import { ApiError } from "@/lib/api-client";
import { formatDate, formatInr, formatRate } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import type { PurchaseOrderView } from "@/types/purchase";
import { DEFAULT_ORDER_TERMS, orderSchema, type OrderFormValues } from "./order-schema";
import type { OurRegistration } from "@/types/company";

interface OrderFormProps {
  vendors: Party[];
  catalog: ItemCatalog;
  godowns: Godown[];
  company: OurRegistration;
  /** Editing an order nothing has come in against yet. */
  order?: PurchaseOrderView;
  onSaved: () => Promise<void>;
}

const emptyLine = { itemId: "", unit: "", quantity: "", rate: "", discountPct: "" };

// A purchase order: what we ask a vendor for, at the rate agreed. No stock
// moves until the goods bill arrives against it. GST follows the vendor, as
// on the bill; the rate last paid is offered when an item is picked.
export function OrderForm({ vendors, catalog, godowns, company, order, onSaved }: OrderFormProps) {
  const today = useToday();
  const router = useRouter();
  const [result, setResult] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [lastPaid, setLastPaid] = useState<Record<number, string>>({});
  const defaultGodown = godowns.find((godown) => godown.isDefault && !godown.archived) ?? godowns.find((godown) => !godown.archived);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      vendorId: order?.vendorId ?? "",
      date: order?.date ?? "",
      expectedDate: order?.expectedDate ?? "",
      godownId: order?.godownId ?? defaultGodown?.id ?? "",
      terms: order ? (order.terms ?? "") : DEFAULT_ORDER_TERMS,
      notes: order?.notes ?? "",
      lines: order?.lines.map((line) => ({
        itemId: line.itemId,
        unit: line.entered.unit,
        quantity: String(line.entered.quantity),
        rate: String(line.entered.rate),
        discountPct: line.discountPct ? String(line.discountPct) : "",
      })) ?? [emptyLine],
    },
  });
  const lineFields = useFieldArray({ control, name: "lines" });

  useEffect(() => {
    if (today && !getValues("date")) setValue("date", today);
  }, [today, getValues, setValue]);

  const [vendorId, lines] = useWatch({ control, name: ["vendorId", "lines"] });
  const vendor = vendors.find((candidate) => candidate.id === vendorId);
  const tax = vendor ? billTax(company, vendor) : undefined;
  const split = tax ? splitRegime(tax, company, vendor?.placeOfSupply) : "no-gst";

  const toLine = (line?: OrderFormValues["lines"][number]) => typedLine(catalog, line);
  const orderLines: InvoiceLine[] = (lines ?? []).map(toLine).filter((line) => line !== undefined);
  const totals = invoiceTotals(orderLines, split);

  const pickItem = async (index: number, itemId: string) => {
    setValue(`lines.${index}.itemId`, itemId, { shouldValidate: true });
    setValue(`lines.${index}.unit`, "");
    try {
      const [last] = await fetchLastRates(["last-rates", vendorId || undefined, itemId] as const);
      if (last && !getValues(`lines.${index}.rate`)) setValue(`lines.${index}.rate`, String(last.rate));
      const baseUnit = toLine(getValues(`lines.${index}`))?.baseUnit ?? "";
      setLastPaid((current) => ({
        ...current,
        [index]: last
          ? `Last paid ${formatRate(last.rate)} per ${baseUnit} on ${formatDate(last.date)}${last.fromThisVendor ? "" : ` to ${last.vendorName}`}`
          : "Not bought before",
      }));
    } catch {
      // Only a suggestion.
    }
  };

  /** A new unit on the line: the typed rate follows it. */
  const pickUnit = (index: number, unit: string, factor: number) => {
    const rate = Number(getValues(`lines.${index}.rate`));
    const from = toLine(getValues(`lines.${index}`))?.unitFactor ?? 1;
    if (rate > 0) setValue(`lines.${index}.rate`, String(restateRate(rate, from, factor)));
    setValue(`lines.${index}.unit`, unit, { shouldValidate: true });
  };

  const onSubmit = handleSubmit(
    async (values) => {
      setResult(null);
      try {
        const saved = await saveOrder(order?.id, {
          vendorId: values.vendorId,
          date: values.date,
          expectedDate: values.expectedDate || null,
          godownId: values.godownId,
          terms: values.terms || null,
          notes: values.notes || null,
          lines: values.lines.map((line) => ({
            itemId: line.itemId,
            unit: line.unit || null,
            quantity: Number(line.quantity),
            rate: Number(line.rate),
            discountPct: Number(line.discountPct) || 0,
            gstRatePct: toLine(line)?.gstRatePct,
          })),
        });
        await onSaved();
        router.push(`/purchase-orders/${saved.id}`);
      } catch (error) {
        setResult({ tone: "error", text: error instanceof ApiError ? error.message : "Could not save. Check the connection and try again." });
      }
    },
    () => setResult({ tone: "error", text: "Some fields need attention. See the ones marked in red above." }),
  );

  const errorText = (message?: string) => message && <p className="text-xs font-semibold text-danger-strong">{message}</p>;
  const itemOptions = catalog.items.map((item) => ({ value: item.id, label: itemLabel(item) }));

  return (
    <form onSubmit={onSubmit} noValidate className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="@container flex min-w-0 flex-col gap-3.5">
        <GlassCard className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{order ? `Edit ${order.number}` : "New purchase order"}</CardTitle>
            {!order && <StatusChip tone="neutral">Numbered on save</StatusChip>}
          </div>
          <div className="grid gap-3.5 @xl:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Controller
                control={control}
                name="vendorId"
                render={({ field }) => (
                  <SelectField
                    label="Vendor"
                    options={vendors.filter((candidate) => !candidate.isGta).map((candidate) => ({ value: candidate.id, label: `${candidate.displayName} · ${placeOf(candidate)}` }))}
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                  />
                )}
              />
              {errorText(errors.vendorId?.message)}
              {tax && <p className="text-xs font-semibold text-muted">{tax.title}: {tax.detail}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Controller
                control={control}
                name="godownId"
                render={({ field }) => (
                  <SelectField
                    label="Deliver to"
                    options={godowns.filter((godown) => !godown.archived).map((godown) => ({ value: godown.id, label: godown.name }))}
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                  />
                )}
              />
              {errorText(errors.godownId?.message)}
            </div>
          </div>
          <div className="grid gap-3.5 @xl:grid-cols-2">
            <TextField label="Order date" type="date" error={errors.date?.message} {...register("date")} />
            <TextField label="Expected by" type="date" hint="Optional" error={errors.expectedDate?.message} {...register("expectedDate")} />
          </div>
        </GlassCard>

        <GlassCard className="flex flex-col gap-3.5">
          <CardTitle>Items</CardTitle>
          {errorText(errors.lines?.root?.message ?? errors.lines?.message)}
          {lineFields.fields.map((field, index) => {
            const line = toLine(lines?.[index]);
            const lineErrors = errors.lines?.[index];
            return (
              <div key={field.id} className="glass-inset flex flex-col gap-2.5 rounded-(--radius-tile) p-3">
                <div className="grid items-start gap-2.5 @2xl:grid-cols-[minmax(0,3fr)_0.8fr_1fr_1fr_1fr_auto]">
                  <div className="flex flex-col gap-1.5">
                    <Controller
                      control={control}
                      name={`lines.${index}.itemId`}
                      render={({ field: itemField }) => (
                        <SelectField label="Item" options={itemOptions} value={itemField.value || undefined} onValueChange={(value) => void pickItem(index, value)} />
                      )}
                    />
                    {errorText(lineErrors?.itemId?.message)}
                    {lastPaid[index] && <p className="text-xs font-semibold text-muted">{lastPaid[index]}</p>}
                  </div>
                  <LineUnitSelect choices={line?.choices ?? []} value={lines?.[index]?.unit ?? ""} onChange={(unit, factor) => pickUnit(index, unit, factor)} />
                  <TextField label={`Quantity${line ? ` (${line.unit})` : ""}`} inputMode="decimal" error={lineErrors?.quantity?.message} {...register(`lines.${index}.quantity`)} />
                  <TextField label={`Rate (₹${line ? ` per ${line.unit}` : ""})`} inputMode="decimal" error={lineErrors?.rate?.message} {...register(`lines.${index}.rate`)} />
                  <TextField label="Discount %" inputMode="decimal" error={lineErrors?.discountPct?.message} {...register(`lines.${index}.discountPct`)} />
                  <Button variant="neutral" aria-label="Remove this line" disabled={lineFields.fields.length === 1} onClick={() => lineFields.remove(index)} className="w-11 px-0 @2xl:mt-[22px]">
                    <Trash2 aria-hidden="true" className="size-[18px]" />
                  </Button>
                </div>
                {line && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-muted">
                    <span>HSN {line.hsn}</span>
                    {line.unitFactor !== 1 && <span>{conversionText(line.unit, line.unitFactor ?? 1, line.baseUnit ?? "")}</span>}
                    <span>GST {line.gstRatePct}%{tax ? ` → ${describeComponents(line.gstRatePct, tax.regime)}` : ""}</span>
                    <span className="ml-auto text-ink tabular-nums">{formatRate(lineTotals(line, "no-gst").taxable)} before GST</span>
                  </div>
                )}
              </div>
            );
          })}
          <Button variant="outline" onClick={() => lineFields.append(emptyLine)} className="self-start">
            <Plus aria-hidden="true" className="size-[18px]" />
            Add an item
          </Button>
        </GlassCard>

        <GlassCard className="flex flex-col gap-3">
          <TextArea label="Terms for the vendor" rows={4} error={errors.terms?.message} {...register("terms")} />
          <TextField label="Notes" placeholder="For us only" error={errors.notes?.message} {...register("notes")} />
          {result && <FormMessage tone={result.tone} result={result}>{result.text}</FormMessage>}
          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : order ? "Save changes" : "Save order"}
            </Button>
            <Link href={order ? `/purchase-orders/${order.id}` : "/purchase-orders"} className={buttonClasses("neutral", "ml-auto", "lg")}>
              Cancel
            </Link>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="flex flex-col gap-2 xl:sticky xl:top-3.5">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Totals</CardTitle>
          {tax && <StatusChip tone={tax.itc ? "brand" : "warning"}>{tax.title}</StatusChip>}
        </div>
        <dl className="flex flex-col gap-1.5 text-sm font-semibold">
          <div className="flex justify-between">
            <dt>Value before GST</dt>
            <dd className="tabular-nums">{formatRate(totals.taxable)}</dd>
          </div>
          {Object.entries(totals.taxByName).map(([name, amount]) => (
            <div key={name} className="flex justify-between">
              <dt>{name}</dt>
              <dd className="tabular-nums">{formatRate(amount ?? 0)}</dd>
            </div>
          ))}
          <div className="my-1 border-t border-line" />
          <div className="flex justify-between text-lg font-semibold">
            <dt>Order total</dt>
            <dd className="tabular-nums">{formatInr(totals.grandTotal)}</dd>
          </div>
        </dl>
        <p className="text-xs font-semibold text-muted">Freight and unloading come later, on the bill or their own bills, and land on the items&rsquo; cost.</p>
      </GlassCard>
    </form>
  );
}
