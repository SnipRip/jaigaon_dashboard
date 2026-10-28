"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
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
import { resolveItemDefaults, type ItemCatalog } from "@/features/items/item-rules";
import type { Party } from "@/features/parties/types";
import { lineCost, lineSales, profitOf } from "@/features/profit/profit-rules";
import { marginPct, RATE_SOURCE_TEXT, rateFor, type PricingBook } from "@/features/rates/rate-rules";
import { formatInr, formatPercent, formatRate } from "@/lib/format";
import { addDays } from "@/lib/dates";
import { useToday } from "@/lib/use-today";
import { DEFAULT_TERMS, quotationTax } from "./quotation-rules";

const decimal = (decimals: number, message: string) => z.string().trim().regex(new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`), message);

const schema = z.object({
  partyId: z.string().min(1, "Pick the customer"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date"),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the validity date"),
  terms: z.string().max(1500),
  notes: z.string().max(300),
  lines: z
    .array(
      z.object({
        itemId: z.string().min(1, "Pick an item"),
        quantity: decimal(3, "Enter the quantity").refine((value) => Number(value) > 0, "More than 0"),
        rate: decimal(2, "Enter the rate"),
        discountPct: z.union([z.literal(""), decimal(2, "0 to 99")]),
      }),
    )
    .min(1, "Add at least one item"),
});
type QuotationFormValues = z.infer<typeof schema>;

interface QuotationFormProps {
  customers: Party[];
  catalog: ItemCatalog;
  book: PricingBook;
  companyState: string;
  suggestedNumber: string;
  /** From Rate enquiry: customer and item quantities. Rates are worked out here. */
  initial?: { partyId?: string; lines: { itemId: string; quantity: number }[] };
}

const emptyLine = { itemId: "", quantity: "", rate: "", discountPct: "" };

// A quotation. Each line's rate comes from Rate management: special rate,
// else price level, else selling price, then quantity slab, never below the
// minimum. The rate can be changed; going below the minimum is flagged.
export function QuotationForm({ customers, catalog, book, companyState, suggestedNumber, initial }: QuotationFormProps) {
  const today = useToday();
  const [result, setResult] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<QuotationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      partyId: initial?.partyId ?? "",
      date: "",
      validUntil: "",
      terms: DEFAULT_TERMS,
      notes: "",
      lines: initial?.lines.length ? initial.lines.map((line) => ({ ...emptyLine, itemId: line.itemId, quantity: String(line.quantity) })) : [emptyLine],
    },
  });
  const lineFields = useFieldArray({ control, name: "lines" });

  // The date is only known in the browser (see useToday). Once it is, lines
  // carried over from Rate enquiry get their rates.
  useEffect(() => {
    if (!today || getValues("date")) return;
    setValue("date", today);
    setValue("validUntil", addDays(today, 7));
    const party = customers.find((candidate) => candidate.id === getValues("partyId"));
    getValues("lines").forEach((line, index) => {
      const item = catalog.items.find((candidate) => candidate.id === line.itemId);
      if (item && !line.rate) setValue(`lines.${index}.rate`, String(rateFor(item, party, Number(line.quantity) || 0, today, book).rate));
    });
  }, [today, getValues, setValue, customers, catalog.items, book]);

  const [partyId, date, lines] = useWatch({ control, name: ["partyId", "date", "lines"] });
  const party = customers.find((candidate) => candidate.id === partyId);

  const quoted = (index: number, itemId = getValues(`lines.${index}.itemId`), quantity = getValues(`lines.${index}.quantity`)) => {
    const item = catalog.items.find((candidate) => candidate.id === itemId);
    return item && date ? rateFor(item, party, Number(quantity) || 0, date, book) : undefined;
  };
  const repriceAll = (nextParty?: Party) => {
    getValues("lines").forEach((line, index) => {
      const item = catalog.items.find((candidate) => candidate.id === line.itemId);
      if (item && date) setValue(`lines.${index}.rate`, String(rateFor(item, nextParty, Number(line.quantity) || 0, date, book).rate));
    });
  };

  const toLine = (line?: QuotationFormValues["lines"][number]): InvoiceLine | undefined => {
    const item = catalog.items.find((candidate) => candidate.id === line?.itemId);
    if (!item || !line) return undefined;
    const defaults = resolveItemDefaults(catalog, item);
    return {
      itemId: item.id,
      description: item.name,
      hsn: defaults.hsn.value ?? "",
      unit: defaults.unit.value ?? "",
      gstRatePct: defaults.gstRatePct.value ?? 0,
      quantity: Number(line.quantity) || 0,
      rate: Number(line.rate) || 0,
      discountPct: Number(line.discountPct) || 0,
    };
  };
  const quotationLines = (lines ?? []).map(toLine).filter((line): line is InvoiceLine => line !== undefined);
  const tax = party ? quotationTax(companyState, party) : undefined;
  const totals = invoiceTotals(quotationLines, tax?.regime ?? "intra-state");
  const profit = profitOf(
    quotationLines.reduce((sum, line) => sum + lineSales(line), 0),
    quotationLines.reduce((sum, line) => sum + lineCost(line, catalog.items), 0),
    0,
  );

  const submit = (send: boolean) =>
    handleSubmit(
      () =>
        setResult({
          tone: "success",
          text: send
            ? "The quotation checks out. Sending on WhatsApp switches on when the WhatsApp Business API is connected."
            : "The quotation checks out. Saving switches on when quotations are connected to the database.",
        }),
      () => setResult({ tone: "error", text: "Some fields need attention. See the ones marked in red above." }),
    );

  return (
    <form onSubmit={submit(false)} noValidate className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="@container flex min-w-0 flex-col gap-3.5">
        <GlassCard className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>New quotation</CardTitle>
            <StatusChip tone="neutral">{suggestedNumber}</StatusChip>
          </div>
          <div className="grid gap-3.5 @xl:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <SelectField
                label="Customer"
                options={customers.map((candidate) => ({ value: candidate.id, label: candidate.displayName }))}
                value={partyId || undefined}
                onValueChange={(id) => {
                  setValue("partyId", id, { shouldValidate: true });
                  repriceAll(customers.find((candidate) => candidate.id === id));
                }}
              />
              {errors.partyId && <p className="text-xs font-semibold text-danger-strong">{errors.partyId.message}</p>}
              {party && <p className="text-xs font-semibold text-muted">{party.priceLevel ? `Price level: ${party.priceLevel}` : "No price level: standard rates"}</p>}
            </div>
            <TextField label="Date" type="date" error={errors.date?.message} {...register("date")} />
            <TextField label="Valid till" type="date" hint="A week by default" error={errors.validUntil?.message} {...register("validUntil")} />
          </div>
        </GlassCard>

        <GlassCard className="flex flex-col gap-3.5">
          <CardTitle>Items</CardTitle>
          {lineFields.fields.map((field, index) => {
            const line = toLine(lines?.[index]);
            const item = catalog.items.find((candidate) => candidate.id === line?.itemId);
            const suggestion = quoted(index, lines?.[index]?.itemId, lines?.[index]?.quantity);
            const netRate = line ? line.rate * (1 - line.discountPct / 100) : 0;
            const lineMargin = item ? Math.round(marginPct(netRate, item.costPrice) * 10) / 10 : undefined;
            const belowMinimum = item?.minSellingPrice && line && netRate < item.minSellingPrice;
            const lineErrors = errors.lines?.[index];
            return (
              <div key={field.id} className="glass-inset flex flex-col gap-2.5 rounded-(--radius-tile) p-3">
                <div className="grid items-start gap-2.5 @2xl:grid-cols-[minmax(0,3fr)_1fr_1fr_1fr_auto]">
                  <div className="flex flex-col gap-1.5">
                    <Controller
                      control={control}
                      name={`lines.${index}.itemId`}
                      render={({ field: itemField }) => (
                        <SelectField
                          label="Item"
                          options={catalog.items.map((candidate) => ({ value: candidate.id, label: `${candidate.name} · ${candidate.sku}` }))}
                          value={itemField.value || undefined}
                          onValueChange={(value) => {
                            setValue(`lines.${index}.itemId`, value, { shouldValidate: true });
                            const next = quoted(index, value);
                            if (next) setValue(`lines.${index}.rate`, String(next.rate));
                          }}
                        />
                      )}
                    />
                    {lineErrors?.itemId && <p className="text-xs font-semibold text-danger-strong">{lineErrors.itemId.message}</p>}
                  </div>
                  <TextField
                    label={`Quantity${line ? ` (${line.unit})` : ""}`}
                    inputMode="decimal"
                    error={lineErrors?.quantity?.message}
                    {...register(`lines.${index}.quantity`, {
                      onBlur: () => {
                        const next = quoted(index);
                        if (next) setValue(`lines.${index}.rate`, String(next.rate));
                      },
                    })}
                  />
                  <TextField label="Rate (₹)" inputMode="decimal" error={lineErrors?.rate?.message} {...register(`lines.${index}.rate`)} />
                  <TextField label="Discount %" inputMode="decimal" error={lineErrors?.discountPct?.message} {...register(`lines.${index}.discountPct`)} />
                  <Button variant="neutral" aria-label="Remove this line" disabled={lineFields.fields.length === 1} onClick={() => lineFields.remove(index)} className="w-11 px-0 @2xl:mt-[22px]">
                    <Trash2 aria-hidden="true" className="size-[18px]" />
                  </Button>
                </div>
                {line && item && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-semibold text-muted">
                    {suggestion && <StatusChip tone={suggestion.source === "standard" ? "neutral" : "brand"}>{RATE_SOURCE_TEXT[suggestion.source]}: {formatRate(suggestion.rate)}</StatusChip>}
                    {suggestion?.slab && <StatusChip tone="success">Slab −{suggestion.slab.discountPct}%</StatusChip>}
                    <span>Stock {item.stock}</span>
                    <span>GST {line.gstRatePct}%{tax ? ` → ${describeComponents(line.gstRatePct, tax.regime)}` : ""}</span>
                    <span className={lineMargin !== undefined && lineMargin < 8 ? "text-danger-strong" : undefined}>Margin {formatPercent(lineMargin ?? 0)}</span>
                    <span className="ml-auto font-semibold text-ink tabular-nums">{formatRate(lineTotals(line, "no-gst").taxable)}</span>
                    {belowMinimum && <span className="w-full font-semibold text-danger-strong">Below the minimum selling price of {formatRate(item.minSellingPrice!)}: needs approval.</span>}
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
          <TextArea label="Terms and conditions" rows={5} error={errors.terms?.message} {...register("terms")} />
          <TextField label="Notes for the customer" error={errors.notes?.message} {...register("notes")} />
          {result && <FormMessage tone={result.tone}>{result.text}</FormMessage>}
          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" size="lg">
              Save quotation
            </Button>
            <Button variant="success" size="lg" onClick={submit(true)}>
              <Send aria-hidden="true" className="size-[18px]" />
              Save and send on WhatsApp
            </Button>
            <Link href="/quotations" className={buttonClasses("neutral", "ml-auto", "lg")}>
              Back to quotations
            </Link>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="flex flex-col gap-2 xl:sticky xl:top-3.5">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Totals</CardTitle>
          {tax && <StatusChip tone="brand">{tax.title}</StatusChip>}
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
            <dt>Quotation total</dt>
            <dd className="tabular-nums">{formatInr(totals.grandTotal)}</dd>
          </div>
        </dl>
        <div className="glass-inset mt-1 flex justify-between rounded-(--radius-tile) px-4 py-3 text-sm font-semibold">
          <span>Profit {formatInr(profit.profit)}</span>
          <span className={profit.marginPct < 8 ? "text-danger-strong" : "text-success-strong"}>{formatPercent(profit.marginPct)}</span>
        </div>
        <p className="text-xs font-semibold text-muted">Profit is on cost price, before freight. Only you see it; it is not printed.</p>
      </GlassCard>
    </form>
  );
}
