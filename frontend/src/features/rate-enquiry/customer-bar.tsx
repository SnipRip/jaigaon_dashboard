import Link from "next/link";
import type { ReactNode } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { SelectField } from "@/components/ui/select-field";
import { fieldLabelClasses } from "@/components/ui/text-field";
import { formatDate, formatInr } from "@/lib/format";
import type { PartyView } from "@/types/party";
import type { RateEnquiryCustomerView } from "@/types/rate-enquiry";

/** Radix Select takes no empty value, so the walk-in choice has its own. */
const WALK_IN = "walk-in";

interface CustomerBarProps {
  customers: PartyView[];
  /** Undefined = walk-in. */
  selectedId?: string;
  onSelect: (customerId: string | undefined) => void;
  /** Null for a walk-in, or while the chosen customer's facts load. */
  facts: RateEnquiryCustomerView | null;
  /** Items whose rate today is this customer's special rate. */
  specialRates: number;
  loading: boolean;
}

/** Customer picker with the facts a salesperson checks before quoting. */
export function CustomerBar({ customers, selectedId, onSelect, facts, specialRates, loading }: CustomerBarProps) {
  const shown: { label: string; value: ReactNode }[] = [];
  if (loading) {
    shown.push({ label: "Pricing", value: "Checking rates…" });
  } else if (selectedId) {
    shown.push({ label: "Pricing", value: specialRates > 0 ? `Special rate on ${specialRates} item${specialRates === 1 ? "" : "s"}` : "Price list" });
    if (facts?.lastQuotation !== undefined) {
      shown.push({
        label: "Last quoted",
        value: facts.lastQuotation ? (
          <Link href={`/quotations/${facts.lastQuotation.id}`} className="text-brand hover:underline">
            {facts.lastQuotation.number} · {formatDate(facts.lastQuotation.date)}
          </Link>
        ) : (
          "No earlier quotation"
        ),
      });
    }
    if (facts?.outstanding !== undefined) shown.push({ label: "Outstanding", value: formatInr(facts.outstanding) });
  } else {
    shown.push({ label: "Pricing", value: "Price list (walk-in)" });
  }

  return (
    <GlassCard className="flex flex-wrap items-end gap-x-5 gap-y-3.5">
      <SelectField
        label="Customer"
        value={selectedId ?? WALK_IN}
        onValueChange={(value) => onSelect(value === WALK_IN ? undefined : value)}
        options={[{ value: WALK_IN, label: "Walk-in customer" }, ...customers.map((customer) => ({ value: customer.id, label: customer.displayName }))]}
        className="flex-[1_1_240px]"
      />
      {shown.map((fact) => (
        <div key={fact.label} className="flex flex-col gap-0.5">
          <span className={fieldLabelClasses}>{fact.label}</span>
          <span className="text-[15px] font-semibold">{fact.value}</span>
        </div>
      ))}
    </GlassCard>
  );
}
