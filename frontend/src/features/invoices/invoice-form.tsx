"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import useSWR from "swr";
import { useDebounceValue } from "usehooks-ts";
import { Button, buttonClasses } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { SelectField } from "@/components/ui/select-field";
import { StatusChip } from "@/components/ui/status-chip";
import { TextField } from "@/components/ui/text-field";
import { chargesGst, describeComponents } from "@/features/gst/gst-rules";
import { INDIAN_STATES, stateName } from "@/features/gst/indian-states";
import { itemLabel, type ItemCatalog } from "@/features/items/item-rules";
import { LineUnitSelect } from "@/features/items/line-unit-select";
import { conversionText, ratePerUnit, restateRate } from "@/features/items/line-units";
import { PICKED_VEHICLE_HINT, useLiveVehicles, VehicleSelect } from "@/features/masters/vehicle-picker";
import { placeOf } from "@/features/parties/party-rules";
import type { Party } from "@/features/parties/types";
import { previewTotals } from "@/features/quotations/quotation-rules";
import { toLineRateOptions, type LineRateOptions } from "@/features/rates/line-rate-options";
import { EMPTY_SALE_LINE, saleLineFactor, saleLineRow } from "@/features/rates/sale-line-row";
import { LineRatePicker } from "@/features/rates/line-rate-picker";
import { fetchLineOptions, LINE_OPTIONS_PATH } from "@/features/rates/rates-api";
import { EVALUATE_SCHEMES_PATH, fetchSchemeResult } from "@/features/schemes/schemes-api";
import { lutFor } from "@/features/tax-export/lut-rules";
import type { Lut } from "@/features/tax-export/types";
import { apiGet, ApiError } from "@/lib/api-client";
import { formatDate, formatQuantity, formatRate } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import type { GodownView } from "@/types/item-master";
import type { VehicleView } from "@/types/vehicle";
import { itemsInStock, stockIn } from "@/features/items/item-stock";
import { exportDeclaration, invoiceTax } from "./invoice-rules";
import { invoiceSchema, type InvoiceFormValues } from "./invoice-schema";
import { InvoiceTotalsCard } from "./invoice-totals-card";
import { createInvoice, numberPreviewPath, type InvoiceBody } from "./invoices-api";
import type { InvoiceKind } from "./types";
import type { OurRegistration } from "@/types/company";

interface InvoiceFormProps {
  kind: InvoiceKind;
  customers: Party[];
  catalog: ItemCatalog;
  /** Active godowns; the goods leave from one, and its stock is drawn. */
  godowns: GodownView[];
  luts: Lut[];
  company: OurRegistration;
  /** Sales setting: the item picker lists only items with stock in the chosen godown. */
  inStockOnly: boolean;
  /** Converting a quotation: its customer and lines; it is marked converted on save. */
  fromQuotation?: { id: string; label: string; partyId: string; lines: { itemId: string; unit?: string; quantity: number; rate: number; discountPct: number }[] };
  onSaved: () => Promise<void>;
}

const KIND_TEXT: Record<InvoiceKind, { title: string; hint: string }> = {
  local: { title: "Local tax invoice", hint: "For buyers in India. GST is CGST + SGST inside West Bengal, IGST for other states." },
  export: { title: "Export invoice", hint: "For buyers in Bhutan and abroad. Under LUT it carries no GST and quotes the LUT number." },
};

const emptyLine = EMPTY_SALE_LINE;

// The bill. Its kind is picked before this opens: a local GST tax invoice or
// an export invoice. Picking an item fills the customer's special rate, else
// today's rate; the line also offers the last rate quoted and sold to this
// customer. Schemes in force show as they would apply. On save the backend
// prices every line again, takes the number from the series and draws the
// goods out of the godown's stock, oldest first; it refuses more than is there.
export function InvoiceForm({ kind, customers, catalog, godowns, luts, company, inStockOnly, fromQuotation, onSaved }: InvoiceFormProps) {
  const isExport = kind === "export";
  const eligible = customers.filter((party) => (isExport ? party.treatment === "overseas" || party.treatment === "sez" : party.treatment !== "overseas"));
  const today = useToday();
  const router = useRouter();
  const quotedParty = fromQuotation && eligible.find((candidate) => candidate.id === fromQuotation.partyId);
  const defaultGodown = godowns.find((godown) => godown.isDefault) ?? godowns[0];
  const [result, setResult] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      number: "",
      date: "",
      partyId: quotedParty?.id ?? "",
      godownId: defaultGodown?.id ?? "",
      placeOfSupply: quotedParty?.placeOfSupply ?? "",
      shipToLine: "",
      shipToCity: "",
      exportRoute: quotedParty?.exportRoute ?? "lut",
      currency: quotedParty?.currency ?? "INR",
      vehicleNumber: "",
      vehicleId: "",
      notes: "",
      lines: fromQuotation?.lines.map((line) => ({
        itemId: line.itemId,
        unit: line.unit ?? "",
        quantity: String(line.quantity),
        rate: String(line.rate),
        discountPct: line.discountPct ? String(line.discountPct) : "",
      })) ?? [emptyLine],
    },
  });
  const lineFields = useFieldArray({ control, name: "lines" });

  // The date is only known in the browser (see useToday); fill it once.
  useEffect(() => {
    if (today && !getValues("date")) setValue("date", today);
  }, [today, getValues, setValue]);

  const vehicles = useLiveVehicles();
  const vehicleId = useWatch({ control, name: "vehicleId" });
  /** A vehicle from the master shows its number read-only; the server records the master's number. */
  const pickVehicle = (vehicle: VehicleView | null) => {
    setValue("vehicleId", vehicle?.id ?? "");
    if (vehicle) setValue("vehicleNumber", vehicle.number, { shouldValidate: true });
  };

  const [partyId, godownId, placeOfSupply, exportRoute, currency, date, lines] = useWatch({
    control,
    name: ["partyId", "godownId", "placeOfSupply", "exportRoute", "currency", "date", "lines"],
  });
  const party = eligible.find((candidate) => candidate.id === partyId);
  const lut = isExport && exportRoute === "lut" && date ? lutFor(luts, date) : undefined;
  const tax = invoiceTax(company, { kind, placeOfSupply, exportRoute }, party ?? { treatment: isExport ? "overseas" : "registered" });

  // The number a save would take; typed only when the series is not automatic.
  const { data: nextNumber } = useSWR<{ number: string | null; method: string }>(date ? numberPreviewPath(kind, date) : null, apiGet);
  const numberTyped = nextNumber !== undefined && nextNumber.method !== "AUTOMATIC";

  // Every item's rate options in one call (special, today's, last quoted, last sold, costs).
  const itemIds = useMemo(() => [...new Set((lines ?? []).map((line) => line.itemId).filter(Boolean))].sort(), [lines]);
  const optionsKey = date && itemIds.length ? ([LINE_OPTIONS_PATH, partyId || undefined, date, itemIds] as const) : null;
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
      const views = await fetchLineOptions([LINE_OPTIONS_PATH, customerId, day, [...new Set(wanted.map((row) => row.itemId))]]);
      for (const { index, itemId } of wanted) {
        const view = views.find((candidate) => candidate.itemId === itemId);
        const factor = factorOfLine(getValues(`lines.${index}`));
        setValue(`lines.${index}.rate`, view?.rate !== null && view?.rate !== undefined ? String(ratePerUnit(view.rate, factor)) : "", { shouldValidate: true });
        setValue(`lines.${index}.discountPct`, "");
      }
    } catch {
      // The rate can always be typed.
    }
  };

  const pickParty = (id: string) => {
    const picked = eligible.find((candidate) => candidate.id === id);
    setValue("partyId", id, { shouldValidate: true });
    if (!picked) return;
    // A new customer brings their own special rates; a quotation's agreed rates stay.
    if (!fromQuotation) void suggest(getValues("lines").map((_, index) => index), id);
    if (isExport) {
      setValue("exportRoute", picked.exportRoute ?? "lut");
      setValue("currency", picked.currency);
    } else {
      setValue("placeOfSupply", picked.placeOfSupply ?? company.stateCode);
    }
  };
  const pickRate = (index: number, rate: number) => {
    setValue(`lines.${index}.rate`, String(rate), { shouldValidate: true });
    setValue(`lines.${index}.discountPct`, "");
  };

  const factorOfLine = (line: { itemId: string; unit: string } | undefined) => saleLineFactor(catalog, line);
  /** A new unit on the line: the typed rate follows it (₹7 a kg → ₹350 a bag). */
  const pickUnit = (index: number, unit: string, factor: number) => {
    const rate = Number(getValues(`lines.${index}.rate`));
    if (rate > 0) setValue(`lines.${index}.rate`, String(restateRate(rate, factorOfLine(getValues(`lines.${index}`)), factor)));
    setValue(`lines.${index}.unit`, unit, { shouldValidate: true });
  };

  const rows = (lines ?? []).map((line, index) => saleLineRow(catalog, line, index, optionsOf));
  const valid = rows.filter((row): row is NonNullable<typeof row> => row !== undefined && row.quantity > 0 && row.rate > 0);

  // What the schemes in force take off, asked of the backend once typing settles.
  const [schemeInput] = useDebounceValue(
    // Schemes work per base unit, as on save.
    JSON.stringify(valid.map((row) => ({ key: row.key, itemId: row.item.id, quantity: row.base.quantity, rate: row.base.rate, discountPct: row.discountPct, rateSource: row.rateSource }))),
    400,
  );
  const { data: schemes } = useSWR(date && schemeInput !== "[]" ? ([EVALUATE_SCHEMES_PATH, partyId || undefined, date, schemeInput] as const) : null, fetchSchemeResult, {
    keepPreviousData: true,
  });
  const priced = valid.map((row) => {
    const scheme = schemes?.lines.find((line) => line.key === row.key);
    // Only trust a result for this exact line; while typing, the line's own value stands.
    const current = scheme && Math.abs(scheme.gross - row.gross) < 0.005 ? scheme : undefined;
    return { ...row, taxable: current?.taxable ?? row.gross, schemeDiscount: current?.schemeDiscount ?? 0, freeQuantity: current?.freeQuantity ?? 0, applied: current?.applied ?? [] };
  });
  const totals = previewTotals(priced, tax.regime);
  const schemeTotal = Math.round(priced.reduce((sum, row) => sum + row.schemeDiscount, 0) * 100) / 100;

  const onSubmit = handleSubmit(
    async (values) => {
      setResult(null);
      if (isExport && values.exportRoute === "lut" && !lut) {
        setResult({ tone: "error", text: "No LUT covers this date. Add it in GST & export setup, or export with IGST paid." });
        return;
      }
      const body: InvoiceBody = {
        kind: isExport ? "EXPORT" : "LOCAL",
        partyId: values.partyId,
        godownId: values.godownId,
        date: values.date,
        number: numberTyped ? values.number.trim() || null : null,
        placeOfSupply: isExport ? null : values.placeOfSupply || null,
        exportRoute: isExport ? (values.exportRoute === "igst" ? "IGST" : "LUT") : null,
        currency: values.currency,
        shipToLine: values.shipToLine.trim() || null,
        shipToCity: values.shipToCity.trim() || null,
        vehicleNumber: values.vehicleId ? null : values.vehicleNumber.trim() || null,
        vehicleId: values.vehicleId || null,
        notes: values.notes.trim() || null,
        quotationId: fromQuotation?.id,
        lines: values.lines.map((line) => ({
          itemId: line.itemId,
          unit: line.unit || null,
          quantity: Number(line.quantity),
          rate: Number(line.rate),
          discountPct: Number(line.discountPct) || 0,
        })),
      };
      try {
        const saved = await createInvoice(body);
        await onSaved();
        router.push(`/invoices/${saved.id}`);
      } catch (error) {
        setResult({ tone: "error", text: error instanceof ApiError ? error.message : "Could not save. Check the connection and try again." });
      }
    },
    () => setResult({ tone: "error", text: "Some fields need attention. See the ones marked in red above." }),
  );

  const godownName = godownId ? (godowns.find((godown) => godown.id === godownId)?.name ?? "the chosen godown") : undefined;
  const pickable = inStockOnly ? itemsInStock(catalog.items, godownId, itemIds) : catalog.items;
  const itemOptions = pickable.map((item) => ({ value: item.id, label: itemLabel(item) }));

  return (
    <form onSubmit={onSubmit} noValidate className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="@container flex min-w-0 flex-col gap-3.5">
        <GlassCard className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{KIND_TEXT[kind].title}</CardTitle>
            <StatusChip tone={isExport ? "success" : "brand"}>{isExport ? "Export" : "Local"}</StatusChip>
            {!fromQuotation && (
              <Link href={`/invoices/new/${isExport ? "local" : "export"}`} className="ml-auto text-xs font-semibold text-brand hover:underline">
                Switch to {isExport ? "a local" : "an export"} invoice
              </Link>
            )}
          </div>
          <p className="-mt-2 text-sm font-medium text-muted">{KIND_TEXT[kind].hint}</p>
          {fromQuotation && (
            <p className="-mt-1 text-sm font-semibold text-brand-strong">
              Filled from quotation {fromQuotation.label}, which is marked converted when this is issued. Check rates and quantities first.
            </p>
          )}
          <div className="grid gap-3.5 @xl:grid-cols-2 @4xl:grid-cols-4">
            <TextField
              label="Invoice number"
              hint={numberTyped ? "Type it, or leave blank for the next in the series" : "Given on save, next in the series"}
              placeholder={nextNumber?.number ?? (numberTyped ? "" : "No number format yet")}
              disabled={!numberTyped}
              error={errors.number?.message}
              {...register("number")}
            />
            <TextField label="Invoice date" type="date" error={errors.date?.message} {...register("date")} />
            <VehicleSelect vehicles={vehicles} vehicleId={vehicleId} onPick={pickVehicle} />
            <TextField
              label="Vehicle number"
              placeholder="WB73E1234"
              readOnly={Boolean(vehicleId)}
              hint={vehicleId ? PICKED_VEHICLE_HINT : undefined}
              error={errors.vehicleNumber?.message}
              {...register("vehicleNumber")}
            />
          </div>
          <div className="grid gap-3.5 @xl:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <SelectField
                label={isExport ? "Buyer outside India" : "Customer"}
                options={eligible.map((candidate) => ({ value: candidate.id, label: `${candidate.displayName} · ${placeOf(candidate)}` }))}
                value={partyId || undefined}
                disabled={Boolean(fromQuotation)}
                onValueChange={pickParty}
              />
              {errors.partyId && <p className="text-xs font-semibold text-danger-strong">{errors.partyId.message}</p>}
              {party && (
                <p className="text-xs font-semibold text-muted">
                  {party.gstin ? `GSTIN ${party.gstin}` : party.foreignTaxId ? `Tax ID ${party.foreignTaxId}` : "No GSTIN"} ·{" "}
                  {party.creditDays === 0 ? "cash" : `${party.creditDays} days credit`}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Controller
                control={control}
                name="godownId"
                render={({ field }) => (
                  <SelectField
                    label="Goods leave from"
                    options={godowns.map((godown) => ({ value: godown.id, label: godown.name }))}
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                  />
                )}
              />
              {errors.godownId && <p className="text-xs font-semibold text-danger-strong">{errors.godownId.message}</p>}
            </div>
          </div>
          {isExport ? (
            <div className="grid gap-3.5 @md:grid-cols-2">
              <Controller
                control={control}
                name="exportRoute"
                render={({ field }) => (
                  <SelectField
                    label="Export route"
                    options={[
                      { value: "lut", label: "Under LUT, no GST" },
                      { value: "igst", label: "IGST paid, refund later" },
                    ]}
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                )}
              />
              <Controller
                control={control}
                name="currency"
                render={({ field }) => (
                  <SelectField
                    label="Currency"
                    options={[
                      { value: "INR", label: "INR" },
                      { value: "BTN", label: "BTN" },
                    ]}
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                )}
              />
            </div>
          ) : (
            <Controller
              control={control}
              name="placeOfSupply"
              render={({ field }) => (
                <SelectField
                  label="Place of supply"
                  options={INDIAN_STATES.map((state) => ({ value: state.code, label: `${state.name} (${state.code})` }))}
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                />
              )}
            />
          )}
          <div className="grid gap-3.5 @xl:grid-cols-[2fr_1fr]">
            <TextField
              label={isExport ? "Deliver to (consignee address)" : "Ship to, if not the billing address"}
              placeholder={party ? party.billing.line1 : "Street, site or godown"}
              error={errors.shipToLine?.message}
              {...register("shipToLine")}
            />
            <TextField label="Town / city" placeholder={party?.billing.city} error={errors.shipToCity?.message} {...register("shipToCity")} />
          </div>
          {isExport && (
            <div className={lut || exportRoute === "igst" ? "glass-inset rounded-(--radius-tile) px-4 py-3" : "rounded-(--radius-tile) bg-danger-tint px-4 py-3"}>
              <p className="text-xs font-medium text-muted">Printed on the invoice</p>
              <p className="text-sm font-semibold">{exportDeclaration({ exportRoute, lutArn: lut?.arn })}</p>
              {exportRoute === "lut" && !lut && date && (
                <p className="text-xs font-semibold text-danger-strong">No LUT covers {formatDate(date)}. Add it in GST & export setup.</p>
              )}
            </div>
          )}
        </GlassCard>

        <GlassCard className="flex flex-col gap-3.5">
          <CardTitle>Items</CardTitle>
          {inStockOnly && (
            <p className="text-xs font-semibold text-muted">
              Listing only items in stock {godownName ? `in ${godownName}` : "in any godown"} (Settings → Sales).
              {pickable.length === 0 && " None has stock there."}
            </p>
          )}
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
                          options={itemOptions}
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
                {row && row.options && <LineRatePicker options={row.options} rate={typedRate} onPick={(rate) => pickRate(index, rate)} />}
                {pricedRow && pricedRow.applied.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5">
                    {pricedRow.applied.map((applied) => (
                      <li key={applied.schemeId}>
                        <StatusChip tone="success">
                          {applied.name}: {applied.freeQuantity ? `+${formatQuantity(applied.freeQuantity)} ${row?.baseUnit ?? ""} free` : `− ${formatRate(applied.amount)}`}
                        </StatusChip>
                      </li>
                    ))}
                  </ul>
                )}
                {row && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-semibold text-muted">
                    {/* The godown's own stock: issuing draws only from it. */}
                    <span className={row.base.quantity + (pricedRow?.freeQuantity ?? 0) > stockIn(row.item, godownId) ? "text-danger-strong" : undefined}>
                      Stock {formatQuantity(stockIn(row.item, godownId))} {row.baseUnit} {godownName ? `in ${godownName}` : "in all godowns"}
                    </span>
                    {row.factor !== 1 && (
                      <span>
                        {conversionText(row.unit, row.factor, row.baseUnit)} · {formatQuantity(row.base.quantity)} {row.baseUnit}
                      </span>
                    )}
                    <span>HSN {row.hsn}</span>
                    <span>GST {row.gstRatePct}% → {describeComponents(row.gstRatePct, tax.regime)}</span>
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
          <TextField label="Notes on the invoice" placeholder="Delivery terms, site name" error={errors.notes?.message} {...register("notes")} />
          {result && <FormMessage tone={result.tone} result={result}>{result.text}</FormMessage>}
          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Issuing…" : "Issue invoice"}
            </Button>
            <Link href="/invoices" className={buttonClasses("neutral", "ml-auto", "lg")}>
              Back to invoices
            </Link>
          </div>
          <p className="text-xs font-semibold text-muted">
            Issuing numbers the invoice and takes the goods out of stock, oldest first. It is not edited afterwards: cancel it (the stock goes back) and issue a new one.
          </p>
        </GlassCard>
      </div>

      <div className="flex flex-col gap-3.5 xl:sticky xl:top-3.5">
        <InvoiceTotalsCard totals={totals} tax={tax} currency={currency} schemeDiscount={schemeTotal} />
        {tax.blocked && <p className="px-2 text-xs font-semibold text-danger-strong">{tax.blocked}.</p>}
        {!isExport && placeOfSupply && !tax.blocked && chargesGst(company) && (
          <p className="px-2 text-xs font-semibold text-muted">
            Place of supply {stateName(placeOfSupply)}: {placeOfSupply === company.stateCode ? "same state, CGST + SGST" : "other state, IGST"}.
          </p>
        )}
        {godownName && <p className="px-2 text-xs font-semibold text-muted">Stock is drawn from {godownName}.</p>}
      </div>
    </form>
  );
}
