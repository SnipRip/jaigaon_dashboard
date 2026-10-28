"use client";

import { useState } from "react";
import { FilterChip } from "@/components/ui/filter-chip";
import { StatusChip } from "@/components/ui/status-chip";
import type { Item } from "@/features/items/types";
import { RecordMaster } from "@/features/masters/record-master";
import type { Party } from "@/features/parties/types";
import { formatDate, formatQuantity, formatRate } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import { ItemRatesTable } from "./item-rates-table";
import { RateCheckCard } from "./rate-check-card";
import { specialRateInForce, type PricingBook } from "./rate-rules";
import type { PriceLevel, QuantitySlab, SpecialRate } from "./types";

type Tab = "items" | "levels" | "special" | "slabs";

const TABS: { value: Tab; label: string }[] = [
  { value: "items", label: "Item prices" },
  { value: "levels", label: "Price levels" },
  { value: "special", label: "Special rates" },
  { value: "slabs", label: "Quantity slabs" },
];

interface RatesWorkspaceProps {
  items: Item[];
  /** Item id → base unit. */
  units: Record<string, string>;
  customers: Party[];
  book: PricingBook;
}

// Smart rate management (SOW 3): item prices, price levels, customer special
// rates and quantity slabs, with a rate check that applies them in order.
export function RatesWorkspace({ items, units, customers, book }: RatesWorkspaceProps) {
  const today = useToday();
  const [tab, setTab] = useState<Tab>("items");
  const itemName = (id: string) => items.find((item) => item.id === id)?.name ?? id;
  const customerName = (id: string) => customers.find((party) => party.id === id)?.displayName ?? id;
  const itemOptions = items.map((item) => ({ value: item.id, label: item.name }));
  const customerOptions = customers.map((party) => ({ value: party.id, label: party.displayName }));

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {TABS.map((option) => (
            <FilterChip key={option.value} selected={tab === option.value} onClick={() => setTab(option.value)}>
              {option.label}
            </FilterChip>
          ))}
        </div>

        {tab === "items" && <ItemRatesTable initialItems={items} units={units} />}

        {tab === "levels" && (
          <RecordMaster<PriceLevel>
            noun={["price level", "price levels"]}
            initialRecords={book.levels}
            nameKey="name"
            blank={{ discountPct: 0 }}
            fields={[
              { key: "name", label: "Name", kind: "text", required: true, placeholder: "Contractor" },
              { key: "discountPct", label: "Discount off MRP %", kind: "number", required: true, hint: "Never below an item's minimum price" },
              { key: "description", label: "Who it is for", kind: "text", wide: true },
            ]}
            columns={[
              { label: "Level", render: (level) => level.name },
              { label: "Off MRP", render: (level) => `${level.discountPct}%`, align: "right" },
              { label: "Who it is for", render: (level) => <span className="text-ink-soft">{level.description ?? "–"}</span> },
            ]}
            searchText={(level) => `${level.name} ${level.description ?? ""}`}
            usage={(level) => customers.filter((party) => party.priceLevel === level.name).length}
            importColumns={["Name", "Discount %", "Who it is for"]}
            footnote="Each customer is put on one level on the customer form. Used in = customers on the level."
          />
        )}

        {tab === "special" && (
          <RecordMaster<SpecialRate>
            noun={["special rate", "special rates"]}
            initialRecords={book.specialRates}
            nameKey="itemId"
            blank={{ kind: "net" }}
            fields={[
              { key: "customerId", label: "Customer", kind: "select", options: customerOptions, required: true },
              { key: "itemId", label: "Item", kind: "select", options: itemOptions, required: true },
              {
                key: "kind",
                label: "Rate is",
                kind: "select",
                required: true,
                options: [
                  { value: "net", label: "A net rate in ₹" },
                  { value: "discount", label: "A discount % off MRP" },
                ],
              },
              { key: "value", label: "Rate ₹ or discount %", kind: "number", required: true },
              { key: "validTill", label: "Valid till", kind: "date", required: true },
              { key: "notes", label: "Notes", kind: "text" },
            ]}
            columns={[
              { label: "Item", render: (rate) => itemName(rate.itemId) },
              { label: "Customer", render: (rate) => customerName(rate.customerId) },
              { label: "Rate", render: (rate) => (rate.kind === "net" ? formatRate(rate.value) : `${rate.value}% off MRP`), align: "right" },
              {
                label: "Valid till",
                render: (rate) => (
                  <span className="flex flex-col items-start gap-1">
                    {formatDate(rate.validTill)}
                    {today && !specialRateInForce(rate, today) && <StatusChip tone="danger">Expired</StatusChip>}
                  </span>
                ),
              },
            ]}
            searchText={(rate) => `${itemName(rate.itemId)} ${customerName(rate.customerId)} ${rate.notes ?? ""}`}
            filters={today ? [{ label: "In force", test: (rate) => specialRateInForce(rate, today) }, { label: "Expired", test: (rate) => !specialRateInForce(rate, today) }] : []}
            stats={(records) => [
              { label: "Special rates", value: formatQuantity(records.length) },
              { label: "Customers with one", value: formatQuantity(new Set(records.map((rate) => rate.customerId)).size) },
              { label: "Expired", value: formatQuantity(today ? records.filter((rate) => !specialRateInForce(rate, today)).length : 0), tone: "warning" },
              { label: "Items covered", value: formatQuantity(new Set(records.map((rate) => rate.itemId)).size) },
            ]}
            importColumns={["Customer", "Item SKU", "Net rate or discount", "Value", "Valid till"]}
            footnote="A special rate beats the price level; an expired one stops applying on its own."
          />
        )}

        {tab === "slabs" && (
          <RecordMaster<QuantitySlab>
            noun={["slab", "quantity slabs"]}
            initialRecords={book.slabs}
            nameKey="itemId"
            fields={[
              { key: "itemId", label: "Item", kind: "select", options: itemOptions, required: true, wide: true },
              { key: "minQuantity", label: "From quantity (base unit)", kind: "number", required: true, decimals: 3 },
              { key: "discountPct", label: "Extra discount %", kind: "number", required: true },
            ]}
            columns={[
              { label: "Item", render: (slab) => itemName(slab.itemId) },
              { label: "From", render: (slab) => `${formatQuantity(slab.minQuantity)} ${units[slab.itemId] ?? ""}`, align: "right" },
              { label: "Extra discount", render: (slab) => `${slab.discountPct}%`, align: "right" },
            ]}
            searchText={(slab) => itemName(slab.itemId)}
            importColumns={["Item SKU", "From quantity", "Extra discount %"]}
            footnote="The largest slab reached applies, on top of the customer's rate, never below the minimum price."
          />
        )}
      </div>

      <div className="xl:sticky xl:top-4">
        <RateCheckCard items={items} customers={customers} book={book} />
      </div>
    </div>
  );
}
