"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import useSWR from "swr";
import { useDebounceValue } from "usehooks-ts";
import { z } from "zod";
import { Button, buttonClasses } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { SelectField } from "@/components/ui/select-field";
import { StatusChip } from "@/components/ui/status-chip";
import { TextArea } from "@/components/ui/text-area";
import { TextField } from "@/components/ui/text-field";
import { describeComponents } from "@/features/gst/gst-rules";
import { itemLabel, type ItemCatalog } from "@/features/items/item-rules";
import type { Party } from "@/features/parties/types";
import { profitOf } from "@/features/profit/profit-rules";
import { LineUnitSelect } from "@/features/items/line-unit-select";
import { conversionText, ratePerUnit, restateRate } from "@/features/items/line-units";
import { toLineRateOptions, type LineRateOptions } from "@/features/rates/line-rate-options";
import { EMPTY_SALE_LINE, saleLineFactor, saleLineRow } from "@/features/rates/sale-line-row";
import { LineRatePicker } from "@/features/rates/line-rate-picker";
import { fetchLineOptions, LINE_OPTIONS_PATH } from "@/features/rates/rates-api";
import { EVALUATE_SCHEMES_PATH, fetchSchemeResult } from "@/features/schemes/schemes-api";
import { ApiError } from "@/lib/api-client";
import { addDays } from "@/lib/dates";
import { formatDate, formatInr, formatPercent, formatQuantity, formatRate } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import type { QuotationView } from "@/types/quotation";
import { DEFAULT_TERMS, previewTotals, quotationTax } from "./quotation-rules";
import { createQuotation, reviseQuotation, type QuotationBody } from "./quotations-api";

const decimal = (decimals: number, message: string) => z.string().trim().regex(new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`), message);

const schema = z.object({
  partyId: z.string().min(1, "Pick the customer"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date"),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the validity date"),
  terms: z.string().max(1500),
  notes: z.string().max(300),
  note: z.string().max(200),
  lines: z
    .array(
      z.object({
        itemId: z.string().min(1, "Pick an item"),
        /** One of the item's units; blank = the base unit. */
        unit: z.string(),
        quantity: decimal(3, "Enter the quantity").refine((value) => Number(value) > 0, "More than 0"),
        rate: decimal(2, "Enter the rate"),
        discountPct: z.union([z.literal(""), decimal(2, "0 to 99")]).refine((value) => !value || Number(value) < 100, "0 to 99"),
      }),
    )
    .min(1, "Add at least one item"),
});
type QuotationFormValues = z.infer<typeof schema>;

interface QuotationFormProps {
  customers: Party[];
  catalog: ItemCatalog;
  companyState: string;
  /** Revising this saved quotation: its lines come in, and a note is asked for. */
  revising?: QuotationView;
  /** From Rate enquiry: customer and item quantities. Rates are worked out here. */
  initial?: { partyId?: string; lines: { itemId: string; quantity: number }[] };
  onSaved: () => Promise<void>;
}

const emptyLine = EMPTY_SALE_LINE;

// A quotation. Picking an item fills the customer's special rate, else
// today's rate from the rate sheet; the line also offers the last rate quoted
// to this customer, each with its margin on the last landed cost. Any rate
// can be typed instead; going below the day's minimum is flagged. Schemes
// in force are shown as they would apply. The backend prices every line again
// on save, so what is stored never depends on this screen's arithmetic.
export function QuotationForm({ customers, catalog, companyState, revising, initial, onSaved }: QuotationFormProps) {
  const today = useToday();
  const router = useRouter();
  const [result, setResult] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<QuotationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      partyId: revising?.partyId ?? initial?.partyId ?? "",
      date: "",
      validUntil: "",
      terms: revising ? (revising.terms ?? "") : DEFAULT_TERMS,
      notes: revising?.notes ?? "",
      note: "",
      lines: revising
        ? revising.lines.map((line) => ({
            itemId: line.itemId,
            unit: line.entered.unit,
            quantity: String(line.entered.quantity),
            rate: String(line.entered.rate),
            discountPct: line.discountPct ? String(line.discountPct) : "",
          }))
        : initial?.lines.length
          ? initial.lines.map((line) => ({ ...emptyLine, itemId: line.itemId, quantity: String(line.quantity) }))
          : [emptyLine],
    },
  });
  const lineFields = useFieldArray({ control, name: "lines" });

  // The date is only known in the browser (see useToday).
  useEffect(() => {
    if (!today || getValues("date")) return;
    setValue("date", today);
    setValue("validUntil", addDays(today, 7));
  }, [today, getValues, setValue]);

  const [partyId, date, lines] = useWatch({ control, name: ["partyId", "date", "lines"] });
  const party = customers.find((candidate) => candidate.id === partyId);
  const tax = party ? quotationTax(companyState, party) : undefined;

  // Every item's rate options in one call (special, today's, last quoted, costs).
  const itemIds = useMemo(() => [...new Set((lines ?? []).map((line) => line.itemId).filter(Boolean))].sort(), [lines]);
  const optionsKey = date && itemIds.length ? ([LINE_OPTIONS_PATH, partyId || undefined, date, itemIds, revising?.id] as const) : null;
  const { data: optionViews } = useSWR(optionsKey, fetchLineOptions, { keepPreviousData: true });
  const optionsOf = useMemo(() => {
    const map = new Map<string, LineRateOptions>();
    for (const view of optionViews ?? []) map.set(view.itemId, toLineRateOptions(view, formatDate));
    return map;
  }, [optionViews]);

  /** Fills the suggested rate for these lines from a fresh call (a new item, or a new customer). */
  const suggest = async (indexes: number[], customerId = partyId || undefined) => {
    const wanted = indexes.map((index) => ({ index, itemId: getValues(`lines.${index}.itemId`) })).filter((row) => row.itemId);
    const day = getValues("date");
    if (!wanted.length || !day) return;
    try {
      const views = await fetchLineOptions([LINE_OPTIONS_PATH, customerId, day, [...new Set(wanted.map((row) => row.itemId))], revising?.id]);
      for (const { index, itemId } of wanted) {
        const view = views.find((candidate) => candidate.itemId === itemId);
        const factor = saleLineFactor(catalog, getValues(`lines.${index}`));
        setValue(`lines.${index}.rate`, view?.rate !== null && view?.rate !== undefined ? String(ratePerUnit(view.rate, factor)) : "", { shouldValidate: true });
        setValue(`lines.${index}.discountPct`, "");
      }
    } catch {
      // The rate can always be typed.
    }
  };

  // Lines carried over from Rate enquiry get their rates once the date is known.
  useEffect(() => {
    if (!date || revising || !initial?.lines.length) return;
    void suggest(initial.lines.map((_, index) => index), initial.partyId);
    // Once, when the date first arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(date)]);

  const pick = (index: number, rate: number) => {
    setValue(`lines.${index}.rate`, String(rate), { shouldValidate: true });
    setValue(`lines.${index}.discountPct`, "");
  };

  /** A new unit on the line: the typed rate follows it (₹7 a kg → ₹350 a bag). */
  const pickUnit = (index: number, unit: string, factor: number) => {
    const rate = Number(getValues(`lines.${index}.rate`));
    if (rate > 0) setValue(`lines.${index}.rate`, String(restateRate(rate, saleLineFactor(catalog, getValues(`lines.${index}`)), factor)));
    setValue(`lines.${index}.unit`, unit, { shouldValidate: true });
  };

  const rows = (lines ?? []).map((line, index) => saleLineRow(catalog, line, index, optionsOf));
  const valid = rows.filter((row): row is NonNullable<typeof row> => row !== undefined && row.quantity > 0 && row.rate > 0);

  // What the schemes in force take off, asked of the backend once typing settles (per base unit, as on save).
  const [schemeInput] = useDebounceValue(
    JSON.stringify(valid.map((row) => ({ key: row.key, itemId: row.item.id, quantity: row.base.quantity, rate: row.base.rate, discountPct: row.discountPct, rateSource: row.rateSource }))),
    400,
  );
  // The debounced lines lag the typed ones, so the key checks those, never an empty list.
  const { data: schemes } = useSWR(date && schemeInput !== "[]" ? ([EVALUATE_SCHEMES_PATH, partyId || undefined, date, schemeInput] as const) : null, fetchSchemeResult, {
    keepPreviousData: true,
  });
  const schemeOf = (key: string) => schemes?.lines.find((line) => line.key === key);

  const priced = valid.map((row) => {
    const scheme = schemeOf(row.key);
    // Only trust a result for this exact line; while typing, the line's own value stands.
    const current = scheme && Math.abs(scheme.gross - row.gross) < 0.005 ? scheme : undefined;
    return { ...row, taxable: current?.taxable ?? row.gross, schemeDiscount: current?.schemeDiscount ?? 0, freeQuantity: current?.freeQuantity ?? 0, applied: current?.applied ?? [] };
  });
  const totals = previewTotals(priced, tax?.regime ?? "intra-state");
  const schemeTotal = Math.round(priced.reduce((sum, row) => sum + row.schemeDiscount, 0) * 100) / 100;
  // marginCost is per line unit (scaled); free units come back in base units.
  const cost = priced.reduce((sum, row) => sum + ((row.options?.marginCost ?? 0) / row.factor) * (row.base.quantity + row.freeQuantity), 0);
  const profit = profitOf(totals.taxable, cost, 0);
  const costMissing = priced.some((row) => row.options && row.options.marginCost === undefined);

  const submit = (status: "DRAFT" | "SENT") =>
    handleSubmit(
      async (values) => {
        setResult(null);
        if (revising && values.note.trim().length < 2) {
          setError("note", { message: "Say why it is revised" });
          return;
        }
        const body: QuotationBody = {
          partyId: values.partyId,
          date: values.date,
          validUntil: values.validUntil,
          status,
          terms: values.terms.trim() || null,
          notes: values.notes.trim() || null,
          lines: values.lines.map((line) => ({
            itemId: line.itemId,
            unit: line.unit || null,
            quantity: Number(line.quantity),
            rate: Number(line.rate),
            discountPct: Number(line.discountPct) || 0,
          })),
        };
        try {
          const saved = revising ? await reviseQuotation(revising.id, { ...body, note: values.note.trim() }) : await createQuotation(body);
          await onSaved();
          router.push(`/quotations/${saved.id}`);
        } catch (error) {
          setResult({ tone: "error", text: error instanceof ApiError ? error.message : "Could not save. Check the connection and try again." });
        }
      },
      () => setResult({ tone: "error", text: "Some fields need attention. See the ones marked in red above." }),
    );

  return (
    <form onSubmit={submit("SENT")} noValidate className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="@container flex min-w-0 flex-col gap-3.5">
        <GlassCard className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{revising ? `Revise ${revising.number}` : "New quotation"}</CardTitle>
            <StatusChip tone="neutral">{revising ? `Becomes R${revising.revision + 1}` : "Numbered on save"}</StatusChip>
          </div>
          <div className="grid gap-3.5 @xl:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <SelectField
                label="Customer"
                options={customers.map((candidate) => ({ value: candidate.id, label: candidate.displayName }))}
                value={partyId || undefined}
                disabled={Boolean(revising)}
                onValueChange={(id) => {
                  setValue("partyId", id, { shouldValidate: true });
                  // A new customer brings their own special rates and history.
                  void suggest(getValues("lines").map((_, index) => index), id);
                }}
              />
              {errors.partyId && <p className="text-xs font-semibold text-danger-strong">{errors.partyId.message}</p>}
            </div>
            <TextField label="Date" type="date" error={errors.date?.message} {...register("date")} />
            <TextField label="Valid till" type="date" hint="A week by default" error={errors.validUntil?.message} {...register("validUntil")} />
          </div>
          {revising && (
            <TextField label="Why it is revised" placeholder="Customer asked for a sharper TMT rate" error={errors.note?.message} {...register("note")} />
          )}
        </GlassCard>

        <GlassCard className="flex flex-col gap-3.5">
          <CardTitle>Items</CardTitle>
          {lineFields.fields.map((field, index) => {
            const row = rows[index];
            const pricedRow = priced.find((candidate) => candidate.key === String(index));
            const typedRate = lines?.[index]?.rate && row ? row.rate * (1 - row.discountPct / 100) : undefined;
            const lineErrors = errors.lines?.[index];
            return (
              <div key={field.id} className="glass-inset flex flex-col gap-2.5 rounded-(--radius-tile) p-3">
                <div className="grid items-start gap-2.5 @2xl:grid-cols-[minmax(0,3fr)_0.8fr_1fr_1fr_1fr_auto]">
                  <div className="flex flex-col gap-1.5">
                    <Controller
                      control={control}
                      name={`lines.${index}.itemId`}
                      render={({ field: itemField }) => (
                        <SelectField
                          label="Item"
                          options={catalog.items.map((candidate) => ({ value: candidate.id, label: itemLabel(candidate) }))}
                          value={itemField.value || undefined}
                          onValueChange={(value) => {
                            setValue(`lines.${index}.itemId`, value, { shouldValidate: true });
                            setValue(`lines.${index}.unit`, "");
                            void suggest([index]);
                          }}
                        />
                      )}
                    />
                    {lineErrors?.itemId && <p className="text-xs font-semibold text-danger-strong">{lineErrors.itemId.message}</p>}
                  </div>
                  <LineUnitSelect choices={row?.choices ?? []} value={lines?.[index]?.unit ?? ""} onChange={(unit, factor) => pickUnit(index, unit, factor)} />
                  <TextField label={`Quantity${row ? ` (${row.unit})` : ""}`} inputMode="decimal" error={lineErrors?.quantity?.message} {...register(`lines.${index}.quantity`)} />
                  <TextField label={`Rate (₹${row ? ` per ${row.unit}` : ""})`} inputMode="decimal" error={lineErrors?.rate?.message} {...register(`lines.${index}.rate`)} />
                  <TextField label="Discount %" inputMode="decimal" error={lineErrors?.discountPct?.message} {...register(`lines.${index}.discountPct`)} />
                  <Button variant="neutral" aria-label="Remove this line" disabled={lineFields.fields.length === 1} onClick={() => lineFields.remove(index)} className="w-11 px-0 @2xl:mt-[22px]">
                    <Trash2 aria-hidden="true" className="size-[18px]" />
                  </Button>
                </div>
                {row && row.options && (
                  <>
                    <LineRatePicker options={row.options} rate={typedRate} onPick={(rate) => pick(index, rate)} />
                    {pricedRow && pricedRow.applied.length > 0 && (
                      <ul className="flex flex-wrap gap-1.5">
                        {pricedRow.applied.map((applied) => (
                          <li key={applied.schemeId}>
                            <StatusChip tone="success">
                              {applied.name}: {applied.freeQuantity ? `+${formatQuantity(applied.freeQuantity)} ${row.baseUnit} free` : `− ${formatRate(applied.amount)}`}
                            </StatusChip>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-semibold text-muted">
                      <span>Stock {formatQuantity(row.item.stock)} {row.baseUnit}</span>
                      {row.factor !== 1 && (
                        <span>
                          {conversionText(row.unit, row.factor, row.baseUnit)} · {formatQuantity(row.base.quantity)} {row.baseUnit}
                        </span>
                      )}
                      <span>GST {row.gstRatePct}%{tax ? ` → ${describeComponents(row.gstRatePct, tax.regime)}` : ""}</span>
                      <span className="ml-auto font-semibold text-ink tabular-nums">
                        {pricedRow && pricedRow.schemeDiscount > 0 ? (
                          <>
                            <span className="mr-1.5 text-muted line-through">{formatRate(pricedRow.gross)}</span>
                            {formatRate(pricedRow.taxable)}
                          </>
                        ) : (
                          formatRate(row.gross)
                        )}
                      </span>
                    </div>
                  </>
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
          {result && <FormMessage tone={result.tone} result={result}>{result.text}</FormMessage>}
          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : revising ? `Save revision R${revising.revision + 1}` : "Save quotation"}
            </Button>
            <Button variant="neutral" size="lg" disabled={isSubmitting} onClick={submit("DRAFT")}>
              Save as draft
            </Button>
            <Link href={revising ? `/quotations/${revising.id}` : "/quotations"} className={buttonClasses("neutral", "ml-auto", "lg")}>
              Cancel
            </Link>
          </div>
          <p className="text-xs font-semibold text-muted">A saved quotation counts as given to the customer and becomes its &ldquo;last quoted&rdquo; rate; a draft does not.</p>
        </GlassCard>
      </div>

      <GlassCard className="flex flex-col gap-2 xl:sticky xl:top-3.5">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Totals</CardTitle>
          {tax && <StatusChip tone="brand">{tax.title}</StatusChip>}
        </div>
        <dl className="flex flex-col gap-1.5 text-sm font-semibold">
          {schemeTotal > 0 && (
            <>
              <div className="flex justify-between">
                <dt>Items</dt>
                <dd className="tabular-nums">{formatRate(totals.taxable + schemeTotal)}</dd>
              </div>
              <div className="flex justify-between text-success-strong">
                <dt>Schemes</dt>
                <dd className="tabular-nums">− {formatRate(schemeTotal)}</dd>
              </div>
            </>
          )}
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
        <p className="text-xs font-semibold text-muted">
          Margin is on the last landed cost (freight and unloading included), free units counted. Only you see it; it is not printed.
          {costMissing && " Some items have no stock yet, so their cost counts as nil."}
        </p>
      </GlassCard>
    </form>
  );
}
