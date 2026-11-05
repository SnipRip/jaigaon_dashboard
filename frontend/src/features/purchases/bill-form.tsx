"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Paperclip, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { Button, buttonClasses } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterGroup } from "@/components/ui/filter-group";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { LoadNotice } from "@/components/ui/load-notice";
import { SelectField } from "@/components/ui/select-field";
import { StatusChip } from "@/components/ui/status-chip";
import { TextField } from "@/components/ui/text-field";
import { describeComponents, treatmentLabel } from "@/features/gst/gst-rules";
import { INDIAN_STATES } from "@/features/gst/indian-states";
import { lineTotals } from "@/features/invoices/invoice-rules";
import { resolveItemDefaults, type ItemCatalog } from "@/features/items/item-rules";
import { expenseHeadsOf, findHead } from "@/features/masters/account-head-rules";
import { allocationLabel } from "@/features/masters/expense-heads-master";
import { useAccountHeads } from "@/features/masters/use-account-heads";
import { placeOf } from "@/features/parties/party-rules";
import type { Party } from "@/features/parties/types";
import type { Godown } from "@/features/masters/types";
import { ApiError } from "@/lib/api-client";
import { formatDate, formatQuantity, formatRate } from "@/lib/format";
import type { PurchaseOrderView } from "@/types/purchase";
import { useToday } from "@/lib/use-today";
import { billSchema, type BillFormValues } from "./bill-schema";
import { BillTotalsCard } from "./bill-totals-card";
import {
  billChargeRate,
  billDueDate,
  billTax,
  billTotals,
  CHARGE_RATES,
  chargeRateRule,
  isMsme,
  LANDED_COST_METHODS,
  landsOnItems,
  MSME_PAYMENT_DAYS,
  splitRegime,
} from "./purchase-rules";
import { createBill, fetchLastRates } from "./purchases-api";
import type { BillCharge, BillKind, BillLine, ChargeHead } from "./types";

interface BillFormProps {
  vendors: Party[];
  catalog: ItemCatalog;
  /** Goods bills a charges bill can be tagged to. */
  purchases: { id: string; label: string }[];
  godowns: Godown[];
  companyState: string;
  initialKind: BillKind;
  initialFor?: string;
  /** Receiving against this order: its vendor, godown and pending lines come in. */
  order?: PurchaseOrderView;
  /** After the save: reload what the other screens read. */
  onSaved: () => Promise<void>;
}

const NOT_TAGGED = "none";

const KIND_TEXT: Record<BillKind, { label: string; hint: string }> = {
  goods: { label: "Goods for stock", hint: "Items come into stock at the bill's rate plus any freight and labour tagged to it." },
  charges: {
    label: "Freight, loading or labour",
    hint: "A transporter's or loader's bill. Tag it to the purchase it belongs to and its cost lands on those items.",
  },
};

const emptyLine = { itemId: "", orderLineId: "", quantity: "", rate: "", discountPct: "", itc: "eligible" as const };
const emptyCharge = { head: "", description: "", amount: "", gstRatePct: "18" };

// A vendor bill, entered from the vendor's paper the way Zoho Books does it.
// GST is never picked: the vendor's treatment and the source of supply decide
// it (gst-rules.ts). Freight and loading on a goods bill follow the bill's
// rate; a separate charges bill is tagged to the purchase for landed cost.
export function BillForm({ vendors, catalog, purchases, godowns, companyState, initialKind, initialFor, order, onSaved }: BillFormProps) {
  const today = useToday();
  const router = useRouter();
  const orderVendor = order && vendors.find((candidate) => candidate.id === order.vendorId);
  const defaultGodown = godowns.find((godown) => godown.isDefault && !godown.archived) ?? godowns.find((godown) => !godown.archived);
  const pendingLines = order?.lines.filter((line) => line.pending > 0) ?? [];
  const { heads, error: headsError } = useAccountHeads();
  const [result, setResult] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<BillFormValues>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      kind: initialKind,
      vendorId: order?.vendorId ?? "",
      vendorBillNumber: "",
      date: "",
      dueDate: "",
      sourceOfSupply: orderVendor?.placeOfSupply ?? "",
      landedCostFor: initialFor ?? "",
      godownId: order?.godownId ?? defaultGodown?.id ?? "",
      purchaseOrderId: order?.id ?? "",
      allocation: "value",
      ewayNumber: "",
      ewayDate: "",
      vehicleNumber: "",
      notes: "",
      lines: pendingLines.length
        ? pendingLines.map((line) => ({
            itemId: line.itemId,
            orderLineId: line.id,
            quantity: String(line.pending),
            rate: String(line.rate),
            discountPct: line.discountPct ? String(line.discountPct) : "",
            itc: "eligible" as const,
          }))
        : [emptyLine],
      charges: initialKind === "charges" ? [emptyCharge] : [],
    },
  });
  const lineFields = useFieldArray({ control, name: "lines" });
  const chargeFields = useFieldArray({ control, name: "charges" });

  // The date is only known in the browser (see useToday); fill it once.
  useEffect(() => {
    if (!today || getValues("date")) return;
    setValue("date", today);
    if (orderVendor) setValue("dueDate", billDueDate(today, orderVendor));
  }, [today, getValues, setValue, orderVendor]);

  const [kind, vendorId, sourceOfSupply, lines, charges, landedCostFor] = useWatch({
    control,
    name: ["kind", "vendorId", "sourceOfSupply", "lines", "charges", "landedCostFor"],
  });
  const isGoods = kind === "goods";
  const eligibleVendors = isGoods ? vendors.filter((vendor) => !vendor.isGta) : vendors;
  const vendor = vendors.find((candidate) => candidate.id === vendorId);
  const tax = vendor ? billTax(companyState, vendor, sourceOfSupply) : undefined;
  const split = tax ? splitRegime(tax, companyState, sourceOfSupply || vendor?.placeOfSupply) : "no-gst";
  // Charges are booked under the live expense heads; each head brings its GST behaviour and where its cost lands.
  const chargeHeads: ChargeHead[] = expenseHeadsOf(heads ?? []);
  const headOf = (ref?: string) => (ref ? findHead(chargeHeads, ref) : undefined);
  const rateRuleFor = (ref?: string) => (tax ? chargeRateRule(tax, headOf(ref)) : undefined);
  // A charges bill adds to a purchase's items only through heads that land on
  // item cost; until a head is picked the tag (say from ?for=) stays.
  const pickedHeads = (charges ?? []).map((charge) => headOf(charge.head)).filter((head) => head !== undefined);
  const landsOnPurchase = pickedHeads.length === 0 || pickedHeads.some(landsOnItems);
  const vendorRule = tax ? chargeRateRule(tax) : undefined;

  // A charge's tag to a purchase goes when no charge lands on item cost any more.
  useEffect(() => {
    if (!landsOnPurchase && getValues("landedCostFor")) setValue("landedCostFor", "");
  }, [landsOnPurchase, getValues, setValue]);

  const setDueDate = (date: string, picked = vendor) => {
    if (picked && /^\d{4}-\d{2}-\d{2}$/.test(date)) setValue("dueDate", billDueDate(date, picked));
  };

  const pickVendor = (id: string) => {
    const picked = vendors.find((candidate) => candidate.id === id);
    setValue("vendorId", id, { shouldValidate: true });
    if (!picked) return;
    setValue("sourceOfSupply", picked.placeOfSupply ?? "");
    setDueDate(getValues("date"), picked);
  };

  const pickKind = (next: BillKind) => {
    setValue("kind", next);
    if (vendor && next === "goods" && vendor.isGta) setValue("vendorId", "");
    if (next === "charges" && getValues("charges").length === 0) chargeFields.append(emptyCharge);
  };

  // A head with its own rate (or none) sets the charge's rate; one that follows the bill keeps what was picked.
  const pickHead = (index: number, id: string) => {
    setValue(`charges.${index}.head`, id, { shouldValidate: true });
    const rule = rateRuleFor(id);
    if (rule?.fixed !== undefined) setValue(`charges.${index}.gstRatePct`, String(rule.fixed));
  };

  // The item has no purchase price of its own; the last bill from this
  // vendor (else any vendor) suggests one. Only a start: type what the bill says.
  const [lastPaid, setLastPaid] = useState<Record<number, string>>({});
  const pickItem = async (index: number, itemId: string) => {
    setValue(`lines.${index}.itemId`, itemId, { shouldValidate: true });
    setValue(`lines.${index}.orderLineId`, "");
    try {
      const [last] = await fetchLastRates(["last-rates", vendorId || undefined, itemId] as const);
      if (last && !getValues(`lines.${index}.rate`)) setValue(`lines.${index}.rate`, String(last.rate));
      setLastPaid((current) => ({
        ...current,
        [index]: last ? `Last paid ${formatRate(last.rate)} on ${formatDate(last.date)}${last.fromThisVendor ? "" : ` to ${last.vendorName}`}` : "Not bought before",
      }));
    } catch {
      // Only a suggestion: the rate is typed from the bill anyway.
    }
  };

  const toBillLine = (line?: BillFormValues["lines"][number]): BillLine | undefined => {
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
      itc: line.itc,
    };
  };
  const billLines = isGoods ? (lines ?? []).map(toBillLine).filter((line): line is BillLine => line !== undefined) : [];
  const billCharges: BillCharge[] = (charges ?? []).map((charge) => ({
    head: charge.head,
    amount: Number(charge.amount) || 0,
    gstRatePct: isGoods ? undefined : (rateRuleFor(charge.head)?.fixed ?? Number(charge.gstRatePct)),
  }));
  const totals = tax ? billTotals({ kind, lines: billLines, charges: billCharges }, tax, split) : undefined;
  const goodsRate = billChargeRate(billLines);

  const onSubmit = handleSubmit(
    async (values) => {
      setResult(null);
      const goods = values.kind === "goods";
      try {
        const saved = await createBill({
          kind: goods ? "GOODS" : "CHARGES",
          vendorId: values.vendorId,
          vendorBillNumber: values.vendorBillNumber,
          date: values.date,
          dueDate: values.dueDate || undefined,
          sourceOfSupply: values.sourceOfSupply || null,
          godownId: goods ? values.godownId : null,
          purchaseOrderId: goods && values.purchaseOrderId ? values.purchaseOrderId : null,
          allocation: values.allocation.toUpperCase(),
          landedCostForId: !goods && values.landedCostFor ? values.landedCostFor : null,
          ewayBillNumber: goods ? values.ewayNumber || null : null,
          ewayBillDate: goods && values.ewayNumber ? values.ewayDate : null,
          vehicleNumber: goods ? values.vehicleNumber || null : null,
          notes: values.notes || null,
          lines: goods
            ? values.lines.map((line) => ({
                itemId: line.itemId,
                orderLineId: line.orderLineId || null,
                quantity: Number(line.quantity),
                rate: Number(line.rate),
                discountPct: Number(line.discountPct) || 0,
                gstRatePct: toBillLine(line)?.gstRatePct ?? 0,
                itcEligible: line.itc === "eligible",
              }))
            : [],
          charges: values.charges.map((charge) => ({
            headId: charge.head,
            description: charge.description || null,
            amount: Number(charge.amount),
            gstRatePct: goods ? undefined : (rateRuleFor(charge.head)?.fixed ?? Number(charge.gstRatePct)),
          })),
        });
        await onSaved();
        router.push(`/purchases/${saved.id}`);
      } catch (error) {
        setResult({ tone: "error", text: error instanceof ApiError ? error.message : "Could not save. Check the connection and try again." });
      }
    },
    () => setResult({ tone: "error", text: "Some fields need attention. See the ones marked in red above." }),
  );

  const itemOptions = catalog.items.map((item) => ({ value: item.id, label: `${item.name} · ${item.sku}` }));
  const errorText = (message?: string) => message && <p className="text-xs font-semibold text-danger-strong">{message}</p>;

  if (!heads) return <LoadNotice error={headsError} what="expense heads" />;

  return (
    <form onSubmit={onSubmit} noValidate className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="@container flex min-w-0 flex-col gap-3.5">
        <GlassCard className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>New bill</CardTitle>
            <StatusChip tone="neutral">Numbered on save</StatusChip>
            {order && <StatusChip tone="brand">Against {order.number}</StatusChip>}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">What is this bill for?</span>
            <FilterGroup label="What is this bill for?">
              {(["goods", "charges"] as const).map((option) => (
                <FilterChip key={option} selected={kind === option} disabled={Boolean(order) && option === "charges"} onClick={() => pickKind(option)}>
                  {KIND_TEXT[option].label}
                </FilterChip>
              ))}
            </FilterGroup>
            <p className="text-sm font-medium text-muted">{KIND_TEXT[kind].hint}</p>
          </div>

          <div className="grid gap-3.5 @xl:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <SelectField
                label="Vendor"
                options={eligibleVendors.map((candidate) => ({ value: candidate.id, label: `${candidate.displayName} · ${placeOf(candidate)}` }))}
                value={vendorId || undefined}
                onValueChange={pickVendor}
                disabled={Boolean(order)}
              />
              {errorText(errors.vendorId?.message)}
              {vendor && (
                <p className="text-xs font-semibold text-muted">
                  {vendor.gstin ? `GSTIN ${vendor.gstin}` : "No GSTIN"} · {treatmentLabel(vendor.treatment)}
                  {vendor.isGta && " · goods transport agency"}
                  {isMsme(vendor) && ` · MSME, pay within ${MSME_PAYMENT_DAYS} days`}
                </p>
              )}
            </div>
            <Controller
              control={control}
              name="sourceOfSupply"
              render={({ field }) => (
                <SelectField
                  label="Source of supply"
                  options={INDIAN_STATES.map((state) => ({ value: state.code, label: `${state.name} (${state.code})` }))}
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={!vendor || vendor.treatment === "overseas"}
                />
              )}
            />
          </div>
          <div className="grid gap-3.5 @xl:grid-cols-3">
            <TextField
              label="Vendor's bill number"
              placeholder="As printed on the bill"
              error={errors.vendorBillNumber?.message}
              {...register("vendorBillNumber")}
            />
            <TextField
              label="Bill date"
              type="date"
              error={errors.date?.message}
              {...register("date", { onChange: (event) => setDueDate(event.target.value) })}
            />
            <TextField
              label="Due date"
              type="date"
              hint={vendor ? `From ${vendor.creditDays} days credit${isMsme(vendor) && vendor.creditDays > MSME_PAYMENT_DAYS ? ", capped at 45 for MSME" : ""}` : undefined}
              error={errors.dueDate?.message}
              {...register("dueDate")}
            />
          </div>
          {isGoods && (
            <div className="grid gap-3.5 @xl:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Controller
                  control={control}
                  name="godownId"
                  render={({ field }) => (
                    <SelectField
                      label="Received into"
                      options={godowns.filter((godown) => !godown.archived).map((godown) => ({ value: godown.id, label: godown.name }))}
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                    />
                  )}
                />
                {errorText(errors.godownId?.message)}
              </div>
              {order && (
                <p className="self-end text-xs font-semibold text-muted">
                  The lines below are what {order.number} still has to come. Change the quantities to what arrived; remove what did not.
                </p>
              )}
            </div>
          )}
          {tax && (
            <div className={tax.itc ? "glass-inset rounded-(--radius-tile) px-4 py-3" : "rounded-(--radius-tile) bg-warning-tint px-4 py-3"}>
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                {tax.title}
                <StatusChip tone={tax.itc ? "success" : "warning"}>{tax.itc ? "Input credit claimable" : "No input credit"}</StatusChip>
              </p>
              <p className="text-xs font-semibold text-ink-soft">{tax.detail}</p>
            </div>
          )}
        </GlassCard>

        {isGoods && (
          <GlassCard className="flex flex-col gap-3.5">
            <CardTitle>Items</CardTitle>
            {errorText(errors.lines?.root?.message ?? errors.lines?.message)}
            {lineFields.fields.map((field, index) => {
              const line = toBillLine(lines?.[index]);
              const lineTotal = line ? lineTotals(line, split) : undefined;
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
                            options={itemOptions}
                            value={itemField.value || undefined}
                            onValueChange={(value) => void pickItem(index, value)}
                            disabled={Boolean(lines?.[index]?.orderLineId)}
                          />
                        )}
                      />
                      {errorText(lineErrors?.itemId?.message)}
                      {lines?.[index]?.orderLineId ? (
                        <p className="text-xs font-semibold text-muted">
                          From {order?.number}: {formatQuantity(order?.lines.find((row) => row.id === lines[index].orderLineId)?.pending ?? 0)} pending
                        </p>
                      ) : (
                        lastPaid[index] && <p className="text-xs font-semibold text-muted">{lastPaid[index]}</p>
                      )}
                    </div>
                    <TextField
                      label={`Quantity${line ? ` (${line.unit})` : ""}`}
                      inputMode="decimal"
                      error={lineErrors?.quantity?.message}
                      {...register(`lines.${index}.quantity`)}
                    />
                    <TextField label="Rate (₹)" inputMode="decimal" error={lineErrors?.rate?.message} {...register(`lines.${index}.rate`)} />
                    <TextField label="Discount %" inputMode="decimal" error={lineErrors?.discountPct?.message} {...register(`lines.${index}.discountPct`)} />
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
                  {line && lineTotal && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold text-muted">
                      <span>HSN {line.hsn}</span>
                      <span>GST {line.gstRatePct}% → {describeComponents(line.gstRatePct, tax?.regime ?? "no-gst")}</span>
                      {tax?.itc && (
                        <Controller
                          control={control}
                          name={`lines.${index}.itc`}
                          render={({ field: itcField }) => (
                            <FilterGroup label="Input credit">
                              <FilterChip selected={itcField.value === "eligible"} onClick={() => itcField.onChange("eligible")}>
                                Claim input credit
                              </FilterChip>
                              <FilterChip selected={itcField.value === "ineligible"} onClick={() => itcField.onChange("ineligible")}>
                                Not eligible, 17(5)
                              </FilterChip>
                            </FilterGroup>
                          )}
                        />
                      )}
                      <span className="ml-auto font-semibold text-ink tabular-nums">{formatRate(lineTotal.taxable)} before GST</span>
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
        )}

        <GlassCard className="flex flex-col gap-3.5">
          <CardTitle>{isGoods ? "Freight and loading on this bill" : "Charges"}</CardTitle>
          <p className="-mt-2 text-sm font-medium text-muted">
            {isGoods
              ? `Only what the vendor printed on this bill. They take the bill's GST rate${billLines.length ? ` (${goodsRate}%)` : ""}. A transporter's own bill is a separate freight bill.`
              : vendorRule?.fixed !== undefined
                ? tax?.regime === "reverse-charge"
                  ? `Reverse charge: the transporter charges no GST; we pay ${vendorRule.fixed}% and claim it back.`
                  : "No GST bill: the amount is the cost."
                : "Each head brings its GST: none, its own rate, or the rate printed on the vendor's bill."}
          </p>
          {errorText(errors.charges?.root?.message ?? errors.charges?.message)}
          {chargeFields.fields.map((field, index) => {
            const head = headOf(charges?.[index]?.head);
            const rule = rateRuleFor(charges?.[index]?.head);
            return (
              <div key={field.id} className="glass-inset grid items-start gap-2.5 rounded-(--radius-tile) p-3 @2xl:grid-cols-[1.2fr_2fr_1fr_1fr_auto]">
                <div className="flex flex-col gap-1.5">
                  <Controller
                    control={control}
                    name={`charges.${index}.head`}
                    render={({ field: headField }) => (
                      <SelectField
                        label="Charge"
                        options={chargeHeads.map((option) => ({ value: option.id, label: option.name }))}
                        value={headOf(headField.value)?.id}
                        onValueChange={(id) => pickHead(index, id)}
                      />
                    )}
                  />
                  {errorText(errors.charges?.[index]?.head?.message)}
                  {head?.allocation && <p className="text-xs font-semibold text-muted">{allocationLabel(head.allocation)}</p>}
                </div>
                <TextField label="Details" placeholder="Route, truck, men" {...register(`charges.${index}.description`)} />
                <TextField label="Amount (₹)" inputMode="decimal" error={errors.charges?.[index]?.amount?.message} {...register(`charges.${index}.amount`)} />
                {isGoods ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted">GST</span>
                    <span className="flex h-[34px] items-center text-[13px] font-semibold">{tax?.itc === false ? "None" : `${goodsRate}%, as the bill`}</span>
                  </div>
                ) : rule?.fixed !== undefined ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted">GST</span>
                    <span className="flex h-[34px] items-center text-[13px] font-semibold">
                      {rule.fixed}%{vendorRule?.fixed === undefined && head ? ", from the head" : ""}
                    </span>
                  </div>
                ) : (
                  <Controller
                    control={control}
                    name={`charges.${index}.gstRatePct`}
                    render={({ field: rateField }) => (
                      <SelectField
                        label="GST on the bill"
                        options={(rule?.options ?? CHARGE_RATES).map((rate) => ({ value: String(rate), label: `${rate}%` }))}
                        value={rateField.value}
                        onValueChange={rateField.onChange}
                        disabled={!vendor}
                      />
                    )}
                  />
                )}
                <Button
                  variant="neutral"
                  aria-label="Remove this charge"
                  disabled={!isGoods && chargeFields.fields.length === 1}
                  onClick={() => chargeFields.remove(index)}
                  className="w-11 px-0 @2xl:mt-[22px]"
                >
                  <Trash2 aria-hidden="true" className="size-[18px]" />
                </Button>
              </div>
            );
          })}
          <Button variant="outline" onClick={() => chargeFields.append(emptyCharge)} className="self-start">
            <Plus aria-hidden="true" className="size-[18px]" />
            Add a charge
          </Button>
          {isGoods && (
            <Controller
              control={control}
              name="allocation"
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <FilterGroup label="Spread freight and tagged bills over the items by">
                    {LANDED_COST_METHODS.map((option) => (
                      <FilterChip key={option.value} selected={field.value === option.value} onClick={() => field.onChange(option.value)}>
                        {option.label}
                      </FilterChip>
                    ))}
                  </FilterGroup>
                  <p className="text-xs font-semibold text-muted">{LANDED_COST_METHODS.find((option) => option.value === field.value)?.hint}. It can be changed on the bill later.</p>
                </div>
              )}
            />
          )}

          {!isGoods &&
            (landsOnPurchase ? (
              <SelectField
                label="Add this cost to the items of"
                options={[{ value: NOT_TAGGED, label: "No purchase: a general expense" }, ...purchases.map((purchase) => ({ value: purchase.id, label: purchase.label }))]}
                value={landedCostFor || NOT_TAGGED}
                onValueChange={(value) => setValue("landedCostFor", value === NOT_TAGGED ? "" : value)}
              />
            ) : (
              <p className="text-xs font-semibold text-muted">
                Only charges under a head that lands on item cost (freight inward, unloading, labour) can be added to a purchase&rsquo;s items.
              </p>
            ))}
        </GlassCard>

        {isGoods && (
          <GlassCard className="flex flex-col gap-3.5">
            <CardTitle>E-way bill</CardTitle>
            <p className="-mt-2 text-sm font-medium text-muted">
              The vendor generates it; we only record it. Above ₹50,000 the truck must carry one.
            </p>
            <div className="grid gap-3.5 @xl:grid-cols-3">
              <TextField label="E-way bill number" inputMode="numeric" placeholder="12 digits" error={errors.ewayNumber?.message} {...register("ewayNumber")} />
              <TextField label="E-way bill date" type="date" error={errors.ewayDate?.message} {...register("ewayDate")} />
              <TextField label="Vehicle number" placeholder="WB73E1234" error={errors.vehicleNumber?.message} {...register("vehicleNumber")} />
            </div>
          </GlassCard>
        )}

        <GlassCard className="flex flex-col gap-3">
          <TextField label="Notes" placeholder="Anything about this bill" error={errors.notes?.message} {...register("notes")} />
          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="neutral" disabled>
              <Paperclip aria-hidden="true" className="size-[18px]" />
              Attach the vendor&rsquo;s bill
            </Button>
            <span className="text-xs font-semibold text-muted">Uploading scans switches on when file storage is chosen.</span>
          </div>
          {result && <FormMessage tone={result.tone}>{result.text}</FormMessage>}
          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save bill"}
            </Button>
            <Link href="/purchases" className={buttonClasses("neutral", "ml-auto", "lg")}>
              Back to bills
            </Link>
          </div>
        </GlassCard>
      </div>

      <div className="flex flex-col gap-3.5 xl:sticky xl:top-3.5">
        {tax && totals ? (
          <BillTotalsCard totals={totals} tax={tax} />
        ) : (
          <GlassCard className="flex flex-col gap-2">
            <CardTitle>Totals</CardTitle>
            <p className="text-sm font-semibold text-muted">Pick the vendor to see the GST on this bill and what comes back as input credit.</p>
          </GlassCard>
        )}
      </div>
    </form>
  );
}
