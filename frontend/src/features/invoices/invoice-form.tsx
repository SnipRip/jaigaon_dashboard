"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { Button, buttonClasses } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { SelectField } from "@/components/ui/select-field";
import { StatusChip } from "@/components/ui/status-chip";
import { TextField } from "@/components/ui/text-field";
import { describeComponents } from "@/features/gst/gst-rules";
import { INDIAN_STATES, stateName } from "@/features/gst/indian-states";
import { resolveItemDefaults, type ItemCatalog } from "@/features/items/item-rules";
import { placeOf } from "@/features/parties/party-rules";
import type { Party } from "@/features/parties/types";
import { lutFor } from "@/features/tax-export/lut-rules";
import type { Lut } from "@/features/tax-export/types";
import { formatRate } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import { exportDeclaration, invoiceTax, invoiceTotals, lineTotals } from "./invoice-rules";
import { invoiceSchema, type InvoiceFormValues } from "./invoice-schema";
import { InvoiceTotalsCard } from "./invoice-totals-card";
import type { InvoiceKind, InvoiceLine } from "./types";

interface InvoiceFormProps {
  kind: InvoiceKind;
  customers: Party[];
  catalog: ItemCatalog;
  luts: Lut[];
  companyState: string;
  suggestedNumber: string;
  /** Converting a quotation: its customer and lines. */
  fromQuotation?: { label: string; partyId: string; lines: { itemId: string; quantity: number; rate: number; discountPct: number }[] };
}

const KIND_TEXT: Record<InvoiceKind, { title: string; hint: string }> = {
  local: { title: "Local tax invoice", hint: "For buyers in India. GST is CGST + SGST inside West Bengal, IGST for other states." },
  export: { title: "Export invoice", hint: "For buyers in Bhutan and abroad. Under LUT it carries no GST and quotes the LUT number." },
};

// The bill. Its kind is picked before this opens: a local GST tax invoice or
// an export invoice. Customers, tax and printed declarations follow the kind;
// HSN, unit and GST rate come from each item, never typed here.
export function InvoiceForm({ kind, customers, catalog, luts, companyState, suggestedNumber, fromQuotation }: InvoiceFormProps) {
  const isExport = kind === "export";
  const eligible = customers.filter((party) => (isExport ? party.treatment === "overseas" || party.treatment === "sez" : party.treatment !== "overseas"));
  const today = useToday();
  const quotedParty = fromQuotation && eligible.find((candidate) => candidate.id === fromQuotation.partyId);
  const [result, setResult] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      number: suggestedNumber,
      date: "",
      partyId: quotedParty?.id ?? "",
      placeOfSupply: quotedParty?.placeOfSupply ?? "",
      shipToLine: "",
      shipToCity: "",
      exportRoute: quotedParty?.exportRoute ?? "lut",
      currency: quotedParty?.currency ?? "INR",
      vehicleNumber: "",
      notes: "",
      lines: fromQuotation?.lines.map((line) => ({
        itemId: line.itemId,
        quantity: String(line.quantity),
        rate: String(line.rate),
        discountPct: line.discountPct ? String(line.discountPct) : "",
      })) ?? [{ itemId: "", quantity: "", rate: "", discountPct: "" }],
    },
  });
  const lineFields = useFieldArray({ control, name: "lines" });

  // The date is only known in the browser (see useToday); fill it once.
  useEffect(() => {
    if (today && !getValues("date")) setValue("date", today);
  }, [today, getValues, setValue]);

  const [partyId, placeOfSupply, exportRoute, currency, date, lines] = useWatch({
    control,
    name: ["partyId", "placeOfSupply", "exportRoute", "currency", "date", "lines"],
  });
  const party = eligible.find((candidate) => candidate.id === partyId);
  const lut = isExport && exportRoute === "lut" && date ? lutFor(luts, date) : undefined;

  const pickParty = (id: string) => {
    const picked = eligible.find((candidate) => candidate.id === id);
    setValue("partyId", id, { shouldValidate: true });
    if (!picked) return;
    if (isExport) {
      setValue("exportRoute", picked.exportRoute ?? "lut");
      setValue("currency", picked.currency);
    } else {
      setValue("placeOfSupply", picked.placeOfSupply ?? "");
    }
  };

  const pickItem = (index: number, itemId: string) => {
    const item = catalog.items.find((candidate) => candidate.id === itemId);
    setValue(`lines.${index}.itemId`, itemId, { shouldValidate: true });
    if (item) setValue(`lines.${index}.rate`, String(item.sellingPrice));
  };

  const toInvoiceLine = (line?: InvoiceFormValues["lines"][number]): InvoiceLine | undefined => {
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
  const invoiceLines = (lines ?? []).map(toInvoiceLine).filter((line): line is InvoiceLine => line !== undefined);
  const tax = invoiceTax(companyState, { kind, placeOfSupply, exportRoute }, party ?? { treatment: isExport ? "overseas" : "registered" });
  const totals = invoiceTotals(invoiceLines, tax.regime);

  const onSubmit = handleSubmit(
    () => {
      if (isExport && exportRoute === "lut" && !lut) {
        setResult({ tone: "error", text: "No LUT covers this date. Add it in GST & export setup, or export with IGST paid." });
        return;
      }
      setResult({
        tone: "success",
        text: "The invoice checks out. Saving and numbering switch on when invoices are connected to the database.",
      });
    },
    () => setResult({ tone: "error", text: "Some fields need attention. See the ones marked in red above." }),
  );

  const itemOptions = catalog.items.map((item) => ({ value: item.id, label: `${item.name} · ${item.sku}` }));

  return (
    <form onSubmit={onSubmit} noValidate className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="@container flex min-w-0 flex-col gap-4">
        <GlassCard className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{KIND_TEXT[kind].title}</CardTitle>
            <StatusChip tone={isExport ? "success" : "brand"}>{isExport ? "Export" : "Local"}</StatusChip>
            <Link href={`/invoices/new/${isExport ? "local" : "export"}`} className="ml-auto text-xs font-bold text-brand hover:underline">
              Switch to {isExport ? "a local" : "an export"} invoice
            </Link>
          </div>
          <p className="-mt-2 text-sm font-medium text-muted">{KIND_TEXT[kind].hint}</p>
          {fromQuotation && (
            <p className="-mt-1 text-sm font-semibold text-brand-strong">
              Filled from quotation {fromQuotation.label}. Check rates and quantities before issuing.
            </p>
          )}
          <div className="grid gap-3.5 @xl:grid-cols-3">
            <TextField label="Invoice number" hint="Next in the series; up to 16 characters" error={errors.number?.message} {...register("number")} />
            <TextField label="Invoice date" type="date" error={errors.date?.message} {...register("date")} />
            <TextField label="Vehicle number" placeholder="WB73E1234" error={errors.vehicleNumber?.message} {...register("vehicleNumber")} />
          </div>
          <div className="grid gap-3.5 @xl:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <SelectField
                label={isExport ? "Buyer outside India" : "Customer"}
                options={eligible.map((candidate) => ({ value: candidate.id, label: `${candidate.displayName} · ${placeOf(candidate)}` }))}
                value={partyId || undefined}
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
          </div>
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
            <div className={lut || exportRoute === "igst" ? "glass-inset rounded-[18px] px-4 py-3" : "rounded-[18px] bg-danger-tint px-4 py-3"}>
              <p className="text-xs font-bold text-muted">Printed on the invoice</p>
              <p className="text-sm font-extrabold">{exportDeclaration({ exportRoute, lutArn: lut?.arn })}</p>
              {exportRoute === "lut" && !lut && date && (
                <p className="text-xs font-bold text-danger-strong">No LUT covers {date}. Add it in GST & export setup.</p>
              )}
            </div>
          )}
        </GlassCard>

        <GlassCard className="flex flex-col gap-3.5">
          <CardTitle>Items</CardTitle>
          {lineFields.fields.map((field, index) => {
            const line = toInvoiceLine(lines?.[index]);
            const lineTotal = line ? lineTotals(line, tax.regime) : undefined;
            return (
              <div key={field.id} className="glass-inset flex flex-col gap-2.5 rounded-[18px] p-3">
                <div className="grid items-end gap-2.5 @2xl:grid-cols-[minmax(0,3fr)_1fr_1fr_1fr_auto]">
                  <Controller
                    control={control}
                    name={`lines.${index}.itemId`}
                    render={({ field: itemField }) => (
                      <SelectField label="Item" options={itemOptions} value={itemField.value || undefined} onValueChange={(value) => pickItem(index, value)} />
                    )}
                  />
                  <TextField
                    label={`Quantity${line ? ` (${line.unit})` : ""}`}
                    inputMode="decimal"
                    error={errors.lines?.[index]?.quantity?.message}
                    {...register(`lines.${index}.quantity`)}
                  />
                  <TextField label="Rate (₹)" inputMode="decimal" error={errors.lines?.[index]?.rate?.message} {...register(`lines.${index}.rate`)} />
                  <TextField label="Discount %" inputMode="decimal" error={errors.lines?.[index]?.discountPct?.message} {...register(`lines.${index}.discountPct`)} />
                  <Button
                    variant="neutral"
                    aria-label="Remove this line"
                    disabled={lineFields.fields.length === 1}
                    onClick={() => lineFields.remove(index)}
                    className="w-11 px-0"
                  >
                    <Trash2 aria-hidden="true" className="size-[18px]" />
                  </Button>
                </div>
                {errors.lines?.[index]?.itemId && <p className="text-xs font-semibold text-danger-strong">{errors.lines[index]?.itemId?.message}</p>}
                {line && lineTotal && (
                  <p className="flex flex-wrap gap-x-3 text-xs font-semibold text-muted">
                    <span>HSN {line.hsn}</span>
                    <span>GST {line.gstRatePct}% → {describeComponents(line.gstRatePct, tax.regime)}</span>
                    <span className="ml-auto font-extrabold text-ink tabular-nums">
                      {formatRate(lineTotal.taxable)} + tax = {formatRate(lineTotal.total)}
                    </span>
                  </p>
                )}
              </div>
            );
          })}
          <Button variant="outline" onClick={() => lineFields.append({ itemId: "", quantity: "", rate: "", discountPct: "" })} className="self-start">
            <Plus aria-hidden="true" className="size-[18px]" />
            Add an item
          </Button>
        </GlassCard>

        <GlassCard className="flex flex-col gap-3">
          <TextField label="Notes on the invoice" placeholder="Delivery terms, site name" error={errors.notes?.message} {...register("notes")} />
          {result && <FormMessage tone={result.tone}>{result.text}</FormMessage>}
          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" className="h-[50px] px-6">
              Issue invoice
            </Button>
            <Link href="/invoices" className={buttonClasses("neutral", "ml-auto h-[50px]")}>
              Back to invoices
            </Link>
          </div>
          {isExport && (
            <p className="text-xs font-semibold text-muted">
              After issuing, attach the lorry hire challan, e-way bill, customs invoice, packing list, shipping bill, LEO
              and finally the BRC on the invoice page.
            </p>
          )}
        </GlassCard>
      </div>

      <div className="flex flex-col gap-4 xl:sticky xl:top-4">
        <InvoiceTotalsCard totals={totals} tax={tax} currency={currency} />
        {!isExport && placeOfSupply && (
          <p className="px-2 text-xs font-semibold text-muted">
            Place of supply {stateName(placeOfSupply)}: {placeOfSupply === companyState ? "same state, CGST + SGST" : "other state, IGST"}.
          </p>
        )}
      </div>
    </form>
  );
}
