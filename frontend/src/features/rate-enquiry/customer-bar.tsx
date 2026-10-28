import { GlassCard } from "@/components/ui/glass-card";
import { SelectField } from "@/components/ui/select-field";
import { fieldLabelClasses } from "@/components/ui/text-field";
import { formatInr } from "@/lib/format";
import type { Customer } from "./types";

interface CustomerBarProps {
  customers: Customer[];
  selected: Customer;
  onSelect: (customerId: string) => void;
}

/** Customer picker with the facts a salesperson needs before quoting. */
export function CustomerBar({ customers, selected, onSelect }: CustomerBarProps) {
  const negotiatedCount = Object.keys(selected.negotiatedDiscountPct).length;
  const facts = [
    { label: "Pricing", value: negotiatedCount > 0 ? `Negotiated on ${negotiatedCount} products` : "Standard discounts" },
    { label: "Last quoted", value: selected.lastQuoted ?? "No earlier quotation" },
    { label: "Outstanding", value: formatInr(selected.outstanding) },
  ];

  return (
    <GlassCard className="flex flex-wrap items-end gap-x-5 gap-y-3.5">
      <SelectField
        label="Customer"
        value={selected.id}
        onValueChange={onSelect}
        options={customers.map((customer) => ({ value: customer.id, label: customer.name }))}
        className="flex-[1_1_240px]"
      />
      {facts.map((fact) => (
        <div key={fact.label} className="flex flex-col gap-0.5">
          <span className={fieldLabelClasses}>{fact.label}</span>
          <span className="text-[15px] font-extrabold">{fact.value}</span>
        </div>
      ))}
    </GlassCard>
  );
}
