"use client";

import { useMemo } from "react";
import { StatusChip } from "@/components/ui/status-chip";
import type { Category, Item } from "@/features/items/types";
import { RecordMaster } from "@/features/masters/record-master";
import type { Party } from "@/features/parties/types";
import { formatDate, formatQuantity, formatRate } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import { RateCheckCard } from "./rate-check-card";
import { specialRateInForce } from "./rate-rules";
import { specialRatePersistence, targetKey } from "./rates-api";
import type { RateTarget, SpecialRate } from "./types";

/** A record as the list shows it: a readable title and the form's item-or-category key. */
type Shown<T> = T & { title: string; target: string };

interface RatesWorkspaceProps {
  items: Item[];
  categories: Category[];
  /** Archived ones included, for the names of old rates. */
  customers: Party[];
  specialRates: SpecialRate[];
  /** Reload after a save. */
  onChanged: () => void;
}

// Smart rate management (SOW 3), as the client runs it (4 Nov 2026): a
// customer's special rate comes first, else the day's rate from the rate
// sheet (Price list). The item master has no selling price, and there are no
// price levels or quantity slabs. The rate check applies the same order.
export function RatesWorkspace({ items, categories, customers, specialRates: rates, onChanged }: RatesWorkspaceProps) {
  const today = useToday();

  // Names for the lists, and the records as shown; stable per load, because
  // RecordMaster swaps its list when the array it is given changes.
  const names = useMemo(() => {
    const categoryNames = new Map(
      categories.flatMap((category) => [
        [category.id, category.name] as const,
        ...category.subCategories.map((sub) => [sub.id, `${category.name} › ${sub.name}`] as const),
      ]),
    );
    const itemNames = new Map(items.map((item) => [item.id, item.name]));
    const customerNames = new Map(customers.map((party) => [party.id, party.displayName]));
    const target = (rate: RateTarget) =>
      rate.itemId ? (itemNames.get(rate.itemId) ?? "Removed item") : `${categoryNames.get(rate.categoryId ?? "") ?? "Removed category"} (all items)`;
    const customer = (id: string) => customerNames.get(id) ?? "Removed customer";
    return {
      categoryNames,
      target,
      customer,
      showRate: (rate: SpecialRate): Shown<SpecialRate> => ({ ...rate, target: targetKey(rate), title: `${target(rate)} for ${customer(rate.customerId)}` }),
    };
  }, [categories, items, customers]);
  const { categoryNames, target: targetName, customer: customerName } = names;
  const specialRates = useMemo(() => rates.map(names.showRate), [rates, names]);

  const targetOptions = [
    ...[...categoryNames].map(([id, name]) => ({ value: `category:${id}`, label: `All of ${name}` })),
    ...items.map((item) => ({ value: `item:${item.id}`, label: `${item.name} · ${item.sku}` })),
  ];
  const customerOptions = customers.filter((party) => !party.archived).map((party) => ({ value: party.id, label: party.displayName }));

  return (
    <div className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-3.5">
          <RecordMaster<Shown<SpecialRate>>
            noun={["special rate", "special rates"]}
            initialRecords={specialRates}
            persist={specialRatePersistence(onChanged, names.showRate)}
            nameKey="title"
            blank={{ kind: "net", validFrom: today ?? undefined }}
            fields={[
              { key: "customerId", label: "Customer", kind: "select", options: customerOptions, required: true },
              { key: "target", label: "Item or category", kind: "select", options: targetOptions, required: true },
              {
                key: "kind",
                label: "Rate is",
                kind: "select",
                required: true,
                options: [
                  { value: "net", label: "A net rate in ₹" },
                  { value: "discount", label: "A discount % off the day's rate" },
                ],
              },
              { key: "value", label: "Rate ₹ or discount %", kind: "number", required: true },
              { key: "validFrom", label: "Valid from", kind: "date", required: true },
              { key: "validTill", label: "Valid till", kind: "date", hint: "Leave empty to run until withdrawn" },
              { key: "notes", label: "Notes", kind: "text", wide: true, maxLength: 300 },
            ]}
            columns={[
              { label: "Item or category", render: (rate) => targetName(rate) },
              { label: "Customer", render: (rate) => customerName(rate.customerId) },
              { label: "Rate", render: (rate) => (rate.kind === "net" ? formatRate(rate.value) : `${rate.value}% off the day's rate`), align: "right" },
              {
                label: "Valid",
                render: (rate) => (
                  <span className="flex flex-col items-start gap-1">
                    {formatDate(rate.validFrom)} – {rate.validTill ? formatDate(rate.validTill) : "until withdrawn"}
                    {today && rate.validTill && rate.validTill < today && <StatusChip tone="danger">Expired</StatusChip>}
                    {today && rate.validFrom > today && <StatusChip tone="neutral">Not started</StatusChip>}
                  </span>
                ),
              },
            ]}
            searchText={(rate) => `${rate.title} ${rate.notes ?? ""}`}
            filters={
              today
                ? [
                    { label: "In force", test: (rate) => specialRateInForce(rate, today) },
                    { label: "Expired", test: (rate) => Boolean(rate.validTill && rate.validTill < today) },
                  ]
                : []
            }
            stats={(records) => [
              { label: "Special rates", value: formatQuantity(records.length) },
              { label: "Customers with one", value: formatQuantity(new Set(records.map((rate) => rate.customerId)).size) },
              { label: "Expired", value: formatQuantity(today ? records.filter((rate) => rate.validTill && rate.validTill < today).length : 0), tone: "warning" },
              { label: "In force today", value: formatQuantity(today ? records.filter((rate) => specialRateInForce(rate, today)).length : 0) },
            ]}
            importMaster="special-rates"
            footnote="A special rate beats the day's rate from the rate sheet, and one on the item beats one on its category. A discount comes off the day's rate, else off MRP. Rates for the same customer and item may not overlap in dates; an expired one stops applying on its own."
          />
      </div>

      <div className="xl:sticky xl:top-3.5">
        <RateCheckCard items={items} customers={customers.filter((party) => !party.archived)} />
      </div>
    </div>
  );
}
