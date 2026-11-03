"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterGroup } from "@/components/ui/filter-group";
import { FormMessage } from "@/components/ui/form-message";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { saveErrorText } from "@/lib/api-client";
import { formatRate } from "@/lib/format";
import type { InstalmentView, LoanDetailView, LoanEntryKind } from "@/types/loan";
import { loanEntrySchema, type LoanEntryValues } from "./loan-entry-schema";
import { entryLabel, recordLoanEntry, voucherOf } from "./loans-api";

interface LoanEntryFormProps {
  loan: LoanDetailView;
  kind: LoanEntryKind;
  /** The schedule row it settles, if any. */
  instalment: InstalmentView | null;
  accounts: SelectOption[];
  today: string;
  onCancel: () => void;
  onSaved: (loan: LoanDetailView, text: string) => void;
}

const money = (value: number | null | undefined) => (value ? value.toFixed(2) : "");
const numberOf = (value: string) => Number(value) || 0;

// One entry against a loan, prefilled from the schedule (the lender's or
// borrower's statement may differ by a few rupees). Which fields show
// depends on the kind; an interest row of a loan without an EMI can be paid
// or added to the loan instead.
export function LoanEntryForm({ loan, kind: initialKind, instalment, accounts, today, onCancel, onSaved }: LoanEntryFormProps) {
  const [kind, setKind] = useState(initialKind);
  const [error, setError] = useState<string | null>(null);
  const taken = loan.direction === "TAKEN";
  const interestDefault = instalment?.interest ?? null;
  const tdsDefault = interestDefault && loan.tdsRatePct ? Math.round((interestDefault * loan.tdsRatePct) / 100) : null;
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoanEntryValues>({
    resolver: zodResolver(loanEntrySchema),
    defaultValues: {
      entryDate: instalment && instalment.dueDate <= today ? instalment.dueDate : today,
      principal: money(instalment?.principal ?? null),
      interest: money(interestDefault),
      tds: money(tdsDefault),
      charges: "",
      bankAccountId: loan.repaymentAccountId,
      reference: "",
      voucherNumber: "",
    },
  });
  const values = useWatch({ control });

  const hasPrincipal = kind === "EMI" || kind === "PRINCIPAL" || kind === "DRAWDOWN";
  const hasInterest = kind === "EMI" || kind === "INTEREST" || kind === "INTEREST_ADDED";
  const hasTds = hasInterest && !(kind === "INTEREST_ADDED" && !taken);
  const hasCharges = taken && (kind === "EMI" || kind === "PRINCIPAL" || kind === "INTEREST");
  const movesMoney = kind !== "INTEREST_ADDED";
  const voucher = voucherOf(loan.direction, kind);
  const canAddToLoan = loan.repayment === "FLEXIBLE" && (instalment?.kind === "INTEREST" || instalment?.kind === "MATURITY") && (kind === "INTEREST" || kind === "INTEREST_ADDED");

  const p = hasPrincipal ? numberOf(values.principal ?? "") : 0;
  const i = hasInterest ? numberOf(values.interest ?? "") : 0;
  const t = hasTds ? numberOf(values.tds ?? "") : 0;
  const c = hasCharges ? numberOf(values.charges ?? "") : 0;
  const net = movesMoney ? (taken && kind !== "DRAWDOWN" ? p + i + c - t : p + i - t) : taken ? i - t : i;
  const netLabel = !movesMoney ? "Added to the loan" : voucher.type === "Payment" ? "Out of the bank" : "Into the bank";

  const submit = async (form: LoanEntryValues) => {
    setError(null);
    try {
      const saved = await recordLoanEntry(loan.id, {
        kind,
        instalmentNo: kind === "PRINCIPAL" || kind === "DRAWDOWN" || (loan.repayment === "EMI" && kind === "INTEREST") ? null : (instalment?.no ?? null),
        entryDate: form.entryDate,
        principal: hasPrincipal ? numberOf(form.principal) : 0,
        interest: hasInterest ? numberOf(form.interest) : 0,
        tds: hasTds ? numberOf(form.tds) : 0,
        charges: hasCharges ? numberOf(form.charges) : 0,
        bankAccountId: movesMoney ? form.bankAccountId || null : null,
        reference: form.reference || null,
        voucherNumber: form.voucherNumber || null,
      });
      onSaved(saved, `${entryLabel(loan.direction, kind)} recorded.`);
    } catch (failure) {
      setError(saveErrorText(failure));
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-3.5">
      {canAddToLoan && (
        <FilterGroup label="How the interest is settled">
          <FilterChip selected={kind === "INTEREST"} onClick={() => setKind("INTEREST")}>
            {taken ? "Paid" : "Received"}
          </FilterChip>
          <FilterChip selected={kind === "INTEREST_ADDED"} onClick={() => setKind("INTEREST_ADDED")}>
            Added to the loan
          </FilterChip>
        </FilterGroup>
      )}
      <div className="grid gap-3.5 sm:grid-cols-2">
        <TextField label="Date" type="date" error={errors.entryDate?.message} {...register("entryDate")} />
        {movesMoney && (
          <Controller
            control={control}
            name="bankAccountId"
            render={({ field }) => (
              <SelectField label={voucher.type === "Payment" ? "Paid from" : "Received into"} options={accounts} value={field.value || undefined} onValueChange={field.onChange} />
            )}
          />
        )}
        {hasPrincipal && <TextField label="Principal (₹)" inputMode="decimal" error={errors.principal?.message} {...register("principal")} />}
        {hasInterest && <TextField label="Interest (₹)" inputMode="decimal" hint="Before TDS." error={errors.interest?.message} {...register("interest")} />}
        {hasTds && (
          <TextField
            label="TDS (₹)"
            inputMode="decimal"
            hint={taken ? "Deducted by us from the interest (TDS Payable)." : "Deducted by the borrower (TDS Receivable)."}
            error={errors.tds?.message}
            {...register("tds")}
          />
        )}
        {hasCharges && <TextField label="Charges (₹)" inputMode="decimal" hint="Bounce or penal charges, to Bank Charges." error={errors.charges?.message} {...register("charges")} />}
        {movesMoney && <TextField label="UTR / NACH / cheque no." error={errors.reference?.message} {...register("reference")} />}
        <TextField
          label={`${voucher.type} voucher number`}
          hint={`Blank: the next number from the ${voucher.series} series.`}
          error={errors.voucherNumber?.message}
          {...register("voucherNumber")}
        />
        <div className="flex flex-col justify-end text-sm font-semibold">
          <span className="text-xs font-medium text-muted">{netLabel}</span>
          {formatRate(net)}
        </div>
      </div>
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2.5">
        <Button variant="neutral" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : `Record ${entryLabel(loan.direction, kind).toLowerCase()}`}
        </Button>
      </div>
    </form>
  );
}
