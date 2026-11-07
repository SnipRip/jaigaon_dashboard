"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import useSWR from "swr";
import { Button, buttonClasses } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterGroup } from "@/components/ui/filter-group";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { LoadNotice } from "@/components/ui/load-notice";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import { StatusChip } from "@/components/ui/status-chip";
import { TextArea } from "@/components/ui/text-area";
import { TextField } from "@/components/ui/text-field";
import { expenseHeadsOf } from "@/features/masters/account-head-rules";
import { ALLOCATIONS } from "@/features/masters/expense-heads-master";
import { useAccountHeads } from "@/features/masters/use-account-heads";
import type { Party } from "@/features/parties/types";
import { MODE_OPTIONS } from "@/features/payments/settlements-api";
import { ApiError, apiGet } from "@/lib/api-client";
import { formatRate } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import type { BankCashAccountView } from "@/types/bank-cash";
import type { ExpenseView } from "@/types/expense";
import { expenseSchema, type ExpenseFormValues } from "./expense-schema";
import { createExpense, decisionProblem, expenseDecision, expenseNumberPreviewPath, expensePreview, TO_BACKEND } from "./expenses-api";
import type { OurRegistration } from "@/types/company";

interface ExpenseFormProps {
  vendors: Party[];
  accounts: BankCashAccountView[];
  /** Open goods bills (item cost), issued invoices and live shipments, as options. */
  bills: SelectOption[];
  invoices: SelectOption[];
  shipments: SelectOption[];
  /** Opened from a shipment page: the expense lands on that shipment. */
  initialShipmentId?: string;
  /** Our GST state and registration, for a vendor's CGST + SGST or IGST and whether it can be claimed. */
  company?: OurRegistration;
  onSaved: (saved: ExpenseView) => Promise<void>;
}

/** The shipment picker's "not yet" choice. */
const LATER = "later";

/** Cash over ₹10,000 to one person in a day is not allowed as a business expense (Income-tax Act s.40A(3)). */
const CASH_EXPENSE_LIMIT = 10000;

// One expense: what it was, who was paid, from which account (or owed to
// the vendor), and whose profit it reduces. The head decides GST and the
// allocation; the vendor's registration decides whether there is GST and
// how it splits. The backend works it all out again on save.
export function ExpenseForm({ vendors, accounts, bills, invoices, shipments, initialShipmentId, company, onSaved }: ExpenseFormProps) {
  const router = useRouter();
  const today = useToday();
  const { heads: allHeads, error: headsError } = useAccountHeads();
  const heads = expenseHeadsOf(allHeads ?? []);
  const [problem, setProblem] = useState<string | null>(null);
  const liveAccounts = accounts.filter((account) => !account.isArchived);
  const firstFor = (mode: string) => liveAccounts.find((account) => (mode === "CASH") === (account.kind === "CASH"))?.id ?? "";
  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: "",
      headId: "",
      description: "",
      amount: "",
      gstRatePct: "18",
      gstBill: true,
      itcEligible: true,
      payeeKind: "other",
      vendorId: "",
      payee: "",
      paid: "now",
      mode: "CASH",
      accountId: firstFor("CASH"),
      reference: "",
      allocationKind: initialShipmentId ? "shipment" : "overhead",
      targetId: initialShipmentId ?? "",
      notes: "",
    },
  });

  useEffect(() => {
    if (today && !getValues("date")) setValue("date", today);
  }, [today, getValues, setValue]);

  const [date, headId, amount, gstRatePct, gstBill, itcEligible, payeeKind, vendorId, paid, mode, allocationKind] = useWatch({
    control,
    name: ["date", "headId", "amount", "gstRatePct", "gstBill", "itcEligible", "payeeKind", "vendorId", "paid", "mode", "allocationKind"],
  });
  const { data: nextNumber } = useSWR<{ number: string | null }>(date ? expenseNumberPreviewPath(date) : null, apiGet);
  const head = heads.find((candidate) => candidate.id === headId);
  const vendor = payeeKind === "vendor" ? vendors.find((candidate) => candidate.id === vendorId) : undefined;
  const decision = expenseDecision(company, vendor, gstBill);
  const refused = decisionProblem(decision);
  const preview = expensePreview(Number(amount) || 0, decision, head, Number(gstRatePct) || 0, itcEligible);
  const indirect = head?.nature === "indirect-expense";
  const allocations = ALLOCATIONS.filter((option) => (indirect ? option.value === "overhead" : option.value !== "item-cost" || head?.allocation === "item-cost"));
  const accountOptions = liveAccounts.filter((account) => (mode === "CASH") === (account.kind === "CASH")).map((account) => ({ value: account.id, label: account.name }));

  const pickHead = (id: string) => {
    const picked = heads.find((candidate) => candidate.id === id);
    setValue("headId", id, { shouldValidate: true });
    if (!picked) return;
    if (picked.gst === "own-rate" && picked.gstRatePct !== undefined) setValue("gstRatePct", String(picked.gstRatePct));
    setValue("allocationKind", picked.allocation ?? "overhead");
    setValue("targetId", picked.allocation === "shipment" ? (initialShipmentId ?? "") : "");
  };
  const pickMode = (next: ExpenseFormValues["mode"]) => {
    setValue("mode", next);
    const current = liveAccounts.find((account) => account.id === getValues("accountId"));
    if (!current || (next === "CASH") !== (current.kind === "CASH")) setValue("accountId", firstFor(next), { shouldValidate: true });
  };

  const onSubmit = handleSubmit(
    async (values) => {
      setProblem(null);
      if (refused) {
        setProblem(refused);
        return;
      }
      try {
        const now = values.paid === "now";
        const saved = await createExpense({
          date: values.date,
          headId: values.headId,
          description: values.description,
          amount: Number(values.amount),
          gstRatePct: preview.rate,
          gstBill: values.gstBill,
          itcEligible: values.itcEligible,
          vendorId: values.payeeKind === "vendor" ? values.vendorId : null,
          payee: values.payeeKind === "other" ? values.payee : null,
          accountId: now ? values.accountId : null,
          mode: now ? values.mode : null,
          allocation: TO_BACKEND[values.allocationKind],
          targetId: values.allocationKind === "overhead" ? null : values.targetId || null,
          reference: values.reference || null,
          notes: values.notes || null,
        });
        await onSaved(saved);
        router.push(`/expenses/${saved.id}`);
      } catch (error) {
        setProblem(error instanceof ApiError ? error.message : "Could not save. Check the connection and try again.");
      }
    },
    () => setProblem("Some fields need attention. See the ones marked in red above."),
  );
  const errorText = (message?: string) => message && <p className="text-xs font-semibold text-danger-strong">{message}</p>;

  if (!allHeads) return <LoadNotice error={headsError} what="expense heads" />;

  return (
    <form onSubmit={onSubmit} noValidate className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="@container flex min-w-0 flex-col gap-3.5">
        <GlassCard className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>New expense</CardTitle>
            {nextNumber?.number && <StatusChip tone="neutral">{nextNumber.number}</StatusChip>}
          </div>
          {date && nextNumber && !nextNumber.number && (
            <FormMessage tone="error" persistent>
              {"No number format for expenses on this date. Add one under Masters, Number series first."}
            </FormMessage>
          )}
          <div className="grid gap-3.5 @xl:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <SelectField label="Expense head" options={heads.map((candidate) => ({ value: candidate.id, label: candidate.name }))} value={headId || undefined} onValueChange={pickHead} />
              {errorText(errors.headId?.message)}
              {head && <p className="text-xs font-semibold text-muted">{[head.tallyGroup, head.notes].filter(Boolean).join(" · ")}</p>}
            </div>
            <TextField label="Date" type="date" max={today ?? undefined} error={errors.date?.message} {...register("date")} />
          </div>
          <TextField label="What it was for" placeholder="Truck to Thimphu, yard rent October" error={errors.description?.message} {...register("description")} />
          <div className="grid gap-3.5 @xl:grid-cols-2">
            <TextField label="Amount before GST (₹)" inputMode="decimal" error={errors.amount?.message} {...register("amount")} />
            <TextField label="Payee's slip or bill number" error={errors.reference?.message} {...register("reference")} />
          </div>
        </GlassCard>

        <GlassCard className="flex flex-col gap-3.5">
          <CardTitle>Who was paid, and how</CardTitle>
          <Controller
            control={control}
            name="payeeKind"
            render={({ field }) => (
              <FilterGroup label="Paid to">
                <FilterChip selected={field.value === "vendor"} onClick={() => field.onChange("vendor")}>
                  A vendor on record
                </FilterChip>
                <FilterChip
                  selected={field.value === "other"}
                  onClick={() => {
                    field.onChange("other");
                    setValue("paid", "now");
                  }}
                >
                  Someone else (cash slip)
                </FilterChip>
              </FilterGroup>
            )}
          />
          {payeeKind === "vendor" ? (
            <div className="flex flex-col gap-1.5">
              <Controller
                control={control}
                name="vendorId"
                render={({ field }) => (
                  <SelectField label="Vendor" options={vendors.map((candidate) => ({ value: candidate.id, label: candidate.displayName }))} value={field.value || undefined} onValueChange={field.onChange} />
                )}
              />
              {errorText(errors.vendorId?.message)}
            </div>
          ) : (
            <TextField label="Paid to" placeholder="Name on the slip" error={errors.payee?.message} {...register("payee")} />
          )}
          <Controller
            control={control}
            name="paid"
            render={({ field }) => (
              <FilterGroup label="Payment">
                <FilterChip selected={field.value === "now"} onClick={() => field.onChange("now")}>
                  Paid now
                </FilterChip>
                <FilterChip selected={field.value === "credit"} onClick={() => field.onChange("credit")} disabled={payeeKind !== "vendor"}>
                  Not paid yet: owed to the vendor
                </FilterChip>
              </FilterGroup>
            )}
          />
          {errorText(errors.paid?.message)}
          {paid === "now" ? (
            <div className="grid gap-3.5 @xl:grid-cols-2">
              <SelectField label="How it was paid" options={MODE_OPTIONS} value={mode} onValueChange={(value) => pickMode(value as ExpenseFormValues["mode"])} />
              <div className="flex flex-col gap-1.5">
                <Controller
                  control={control}
                  name="accountId"
                  render={({ field }) => <SelectField label="From account" options={accountOptions} value={field.value || undefined} onValueChange={field.onChange} />}
                />
                {accountOptions.length === 0 ? (
                  <p className="text-xs font-semibold text-danger-strong">
                    {mode === "CASH" ? "No cash account yet. Cash is paid from a cash book, like Cash in hand." : "No bank account yet."}{" "}
                    <Link href="/masters/bank-cash" className="text-brand underline">
                      Add one under Bank &amp; cash
                    </Link>
                  </p>
                ) : (
                  errorText(errors.accountId?.message)
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm font-medium text-muted">It goes on the vendor&apos;s account and is paid later from Payments, like a bill.</p>
          )}
          {paid === "now" && mode === "CASH" && preview.total > CASH_EXPENSE_LIMIT && (
            <FormMessage tone="error" persistent>Cash over ₹10,000 to one person in a day is not allowed as a business expense (Income-tax Act s.40A(3)). Pay by bank if you can.</FormMessage>
          )}
        </GlassCard>

        <GlassCard className="flex flex-col gap-3.5">
          <CardTitle>GST</CardTitle>
          {refused ? (
            <FormMessage tone="error">{refused}</FormMessage>
          ) : (
            <>
              {payeeKind === "other" && (
                <Controller
                  control={control}
                  name="gstBill"
                  render={({ field }) => (
                    <FilterGroup label="The payee gave">
                      <FilterChip selected={field.value} onClick={() => field.onChange(true)}>
                        A GST tax invoice
                      </FilterChip>
                      <FilterChip selected={!field.value} onClick={() => field.onChange(false)}>
                        A slip without GST
                      </FilterChip>
                    </FilterGroup>
                  )}
                />
              )}
              <div className="grid gap-3.5 @xl:grid-cols-2">
                {preview.rule.fixed === undefined ? (
                  <Controller
                    control={control}
                    name="gstRatePct"
                    render={({ field }) => (
                      <SelectField
                        label="GST on the bill"
                        options={[0, ...preview.rule.options].map((rate) => ({ value: String(rate), label: rate ? `${rate}%` : "No GST" }))}
                        value={field.value}
                        onValueChange={field.onChange}
                      />
                    )}
                  />
                ) : (
                  <div className="flex flex-col gap-1">
                    <span className="text-[13px] font-semibold">GST on the bill</span>
                    <p className="text-sm font-medium text-muted">
                      {preview.rate ? `${preview.rate}%` : "No GST"} ·{" "}
                      {decision.regime === "no-gst" ? (vendor ? "the vendor does not charge GST" : "no GST bill") : head?.gst === "none" ? "the head has no GST" : "the head's own rate"}
                    </p>
                  </div>
                )}
                {preview.tax > 0 && (
                  <Controller
                    control={control}
                    name="itcEligible"
                    render={({ field }) => (
                      <FilterGroup label="Input credit">
                        <FilterChip selected={field.value} onClick={() => field.onChange(true)}>
                          Claimed
                        </FilterChip>
                        <FilterChip selected={!field.value} onClick={() => field.onChange(false)}>
                          Blocked (17(5))
                        </FilterChip>
                      </FilterGroup>
                    )}
                  />
                )}
              </div>
            </>
          )}
        </GlassCard>

        <GlassCard className="flex flex-col gap-3.5">
          <CardTitle>Whose profit it reduces</CardTitle>
          <Controller
            control={control}
            name="allocationKind"
            render={({ field }) => (
              <FilterGroup label="Where the cost lands">
                {allocations.map((option) => (
                  <FilterChip
                    key={option.value}
                    selected={field.value === option.value}
                    onClick={() => {
                      field.onChange(option.value);
                      setValue("targetId", option.value === "shipment" ? (initialShipmentId ?? "") : "");
                    }}
                  >
                    {option.label}
                  </FilterChip>
                ))}
              </FilterGroup>
            )}
          />
          <p className="-mt-2 text-sm font-medium text-muted">
            {indirect ? "An indirect expense is always a general overhead" : ALLOCATIONS.find((option) => option.value === allocationKind)?.hint}.
            {allocationKind === "shipment" && " Pick the truck now, or save it and link it from the shipment page later."}
            {allocationKind === "item-cost" && " The purchase's landed cost and its stock are worked out again."}
          </p>
          {(allocationKind === "item-cost" || allocationKind === "invoice") && (
            <div className="flex flex-col gap-1.5">
              <Controller
                control={control}
                name="targetId"
                render={({ field }) => (
                  <SelectField
                    label={allocationKind === "item-cost" ? "Purchase (goods bill)" : "Invoice"}
                    options={allocationKind === "item-cost" ? bills : invoices}
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                  />
                )}
              />
              {errorText(errors.targetId?.message)}
            </div>
          )}
          {allocationKind === "shipment" && (
            <Controller
              control={control}
              name="targetId"
              render={({ field }) => (
                <SelectField
                  label="Shipment"
                  options={[{ value: LATER, label: "Link it later" }, ...shipments]}
                  value={field.value || LATER}
                  onValueChange={(value) => field.onChange(value === LATER ? "" : value)}
                />
              )}
            />
          )}
        </GlassCard>

        <GlassCard className="flex flex-col gap-3">
          <TextArea label="Notes" rows={2} {...register("notes")} />
          {problem && <FormMessage tone="error">{problem}</FormMessage>}
          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save expense"}
            </Button>
            <Link href="/expenses" className={buttonClasses("neutral", "ml-auto", "lg")}>
              Back to expenses
            </Link>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="flex flex-col gap-3 xl:sticky xl:top-3.5">
        <CardTitle>Amount</CardTitle>
        <dl className="flex flex-col gap-1.5 text-sm font-semibold">
          <div className="flex justify-between">
            <dt>Before GST</dt>
            <dd className="tabular-nums">{formatRate(Number(amount) || 0)}</dd>
          </div>
          {preview.cgst > 0 && (
            <div className="flex justify-between">
              <dt>CGST + SGST {preview.rate}%</dt>
              <dd className="tabular-nums">{formatRate(preview.cgst + preview.sgst)}</dd>
            </div>
          )}
          {preview.igst > 0 && (
            <div className="flex justify-between">
              <dt>IGST {preview.rate}%</dt>
              <dd className="tabular-nums">{formatRate(preview.igst)}</dd>
            </div>
          )}
          <div className="my-1 border-t border-line" />
          <div className="flex justify-between text-lg font-semibold">
            <dt>{paid === "now" ? "Paid" : "Owed"}</dt>
            <dd className="tabular-nums">{formatRate(preview.total)}</dd>
          </div>
          <div className="flex justify-between text-muted">
            <dt>Reduces profit by</dt>
            <dd className="tabular-nums">{formatRate(preview.cost)}</dd>
          </div>
        </dl>
        <p className="text-xs font-semibold text-muted">
          {preview.tax === 0
            ? "No GST: the whole amount is the cost."
            : preview.claimable
              ? "The GST is claimed back as input credit, so only the amount before GST is the cost."
              : "The GST cannot be claimed, so it is part of the cost."}
        </p>
        <p className="text-xs font-semibold text-muted">
          Posts a {paid === "now" ? "Payment" : "Purchase"} voucher: Dr {head?.name ?? "the head"}
          {preview.tax > 0 && preview.claimable ? ", Dr Input GST" : ""}, Cr {paid === "now" ? "the account" : (vendor?.displayName ?? "the vendor")}.
        </p>
      </GlassCard>
    </form>
  );
}
