"use client";

import { Layers } from "lucide-react";
import { useMemo, useState } from "react";
import { StatusChip } from "@/components/ui/status-chip";
import { ViewTabs } from "@/components/ui/view-tabs";
import type { Category, Item } from "@/features/items/types";
import { RecordMaster } from "@/features/masters/record-master";
import type { Party } from "@/features/parties/types";
import { formatDate, formatQuantity, formatRate } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import { ItemRatesTable } from "./item-rates-table";
import { LevelCategoryDiscounts } from "./level-category-discounts";
import { RateCheckCard } from "./rate-check-card";
import { specialRateInForce, type PricingBook } from "./rate-rules";
import { priceLevelPersistence, saveItemPrices, slabPersistence, specialRatePersistence, targetKey } from "./rates-api";
import type { PriceLevel, QuantitySlab, RateTarget, SpecialRate } from "./types";

type Tab = "items" | "levels" | "special" | "slabs";

const TABS: { value: Tab; label: string }[] = [
  { value: "items", label: "Item prices" },
  { value: "levels", label: "Price levels" },
  { value: "special", label: "Special rates" },
  { value: "slabs", label: "Quantity slabs" },
];

/** A record as the list shows it: a readable title and the form's item-or-category key. */
type Shown<T> = T & { title: string; target: string };

interface RatesWorkspaceProps {
  items: Item[];
  categories: Category[];
  /** Item id → base unit. */
  units: Record<string, string>;
  /** Archived ones included, for the names of old rates. */
  customers: Party[];
  book: PricingBook;
  /** Reload after a save. */
  onChanged: Record<"items" | "levels" | "specialRates" | "slabs", () => void>;
}

// Smart rate management (SOW 3): item prices, price levels, customer special
// rates and quantity slabs, with a rate check that applies them in order.
export function RatesWorkspace({ items, categories, units, customers, book, onChanged }: RatesWorkspaceProps) {
  const today = useToday();
  const [tab, setTab] = useState<Tab>("items");
  const [discountsOf, setDiscountsOf] = useState<PriceLevel | null>(null);

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
      showSlab: (slab: QuantitySlab): Shown<QuantitySlab> => ({ ...slab, target: targetKey(slab), title: `${target(slab)} from ${formatQuantity(slab.minQuantity)}` }),
    };
  }, [categories, items, customers]);
  const { categoryNames, target: targetName, customer: customerName } = names;
  const specialRates = useMemo(() => book.specialRates.map(names.showRate), [book.specialRates, names]);
  const slabs = useMemo(() => book.slabs.map(names.showSlab), [book.slabs, names]);

  const targetOptions = [
    ...[...categoryNames].map(([id, name]) => ({ value: `category:${id}`, label: `All of ${name}` })),
    ...items.map((item) => ({ value: `item:${item.id}`, label: `${item.name} · ${item.sku}` })),
  ];
  const customerOptions = customers.filter((party) => !party.archived).map((party) => ({ value: party.id, label: party.displayName }));
  const categoryOptions = [...categoryNames].map(([value, label]) => ({ value, label }));

  const levelDiscountText = (level: PriceLevel) =>
    level.categoryDiscounts.length
      ? level.categoryDiscounts.map((row) => `${categoryNames.get(row.categoryId) ?? "?"} ${row.discountPct}%`).join(", ")
      : "–";

  return (
    <div className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-3.5">
        <ViewTabs label="Rate views" tabs={TABS} value={tab} onChange={setTab} />

        {tab === "items" && (
          <ItemRatesTable
            initialItems={items}
            units={units}
            onSave={async (item, prices) => {
              await saveItemPrices(item, prices);
              onChanged.items();
            }}
          />
        )}

        {tab === "levels" && (
          <RecordMaster<PriceLevel>
            noun={["price level", "price levels"]}
            initialRecords={book.levels}
            persist={priceLevelPersistence(onChanged.levels)}
            nameKey="name"
            blank={{ discountPct: 0 }}
            fields={[
              { key: "name", label: "Name", kind: "text", required: true, placeholder: "Contractor", maxLength: 60 },
              { key: "discountPct", label: "Discount off MRP %", kind: "number", required: true, hint: "For every category without its own figure. Never below an item's minimum price" },
              { key: "description", label: "Who it is for", kind: "text", wide: true, maxLength: 200 },
            ]}
            columns={[
              { label: "Level", render: (level) => level.name },
              { label: "Off MRP", render: (level) => `${level.discountPct}%`, align: "right" },
              { label: "By category", render: (level) => <span className="text-ink-soft">{levelDiscountText(level)}</span> },
              { label: "Who it is for", render: (level) => <span className="text-ink-soft">{level.description ?? "–"}</span> },
            ]}
            rowActions={[{ label: (level) => `Category discounts of ${level.name}`, icon: <Layers aria-hidden="true" className="size-4" />, onClick: setDiscountsOf }]}
            searchText={(level) => `${level.name} ${level.description ?? ""}`}
            usage={(level) => level.customerCount ?? 0}
            importColumns={["Name", "Discount %", "Who it is for"]}
            footnote="Each customer is put on one level on the customer form. A level is taken off MRP; an item without MRP gets its selling price. Used in = customers on the level."
          />
        )}

        {tab === "special" && (
          <RecordMaster<Shown<SpecialRate>>
            noun={["special rate", "special rates"]}
            initialRecords={specialRates}
            persist={specialRatePersistence(onChanged.specialRates, names.showRate)}
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
                  { value: "discount", label: "A discount % off MRP" },
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
              { label: "Rate", render: (rate) => (rate.kind === "net" ? formatRate(rate.value) : `${rate.value}% off MRP`), align: "right" },
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
            importColumns={["Customer", "Item SKU or category", "Net rate or discount", "Value", "Valid from", "Valid till"]}
            footnote="A special rate beats the price level, and one on the item beats one on its category. Rates for the same customer and item may not overlap in dates; an expired one stops applying on its own."
          />
        )}

        {tab === "slabs" && (
          <RecordMaster<Shown<QuantitySlab>>
            noun={["slab", "quantity slabs"]}
            initialRecords={slabs}
            persist={slabPersistence(onChanged.slabs, names.showSlab)}
            nameKey="title"
            fields={[
              { key: "target", label: "Item or category", kind: "select", options: targetOptions, required: true, wide: true },
              { key: "minQuantity", label: "From quantity (base unit)", kind: "number", required: true, decimals: 3 },
              { key: "discountPct", label: "Extra discount %", kind: "number", required: true },
            ]}
            columns={[
              { label: "Item or category", render: (slab) => targetName(slab) },
              { label: "From", render: (slab) => `${formatQuantity(slab.minQuantity)} ${slab.itemId ? (units[slab.itemId] ?? "") : ""}`, align: "right" },
              { label: "Extra discount", render: (slab) => `${slab.discountPct}%`, align: "right" },
            ]}
            searchText={(slab) => slab.title}
            importColumns={["Item SKU or category", "From quantity", "Extra discount %"]}
            footnote="The largest slab reached applies, on top of the customer's rate, never below the minimum price. A slab on the item beats one on its category."
          />
        )}
      </div>

      <div className="xl:sticky xl:top-3.5">
        <RateCheckCard items={items} customers={customers.filter((party) => !party.archived)} />
      </div>

      <LevelCategoryDiscounts
        level={discountsOf}
        categories={categoryOptions}
        onClose={() => setDiscountsOf(null)}
        onSaved={onChanged.levels}
      />
    </div>
  );
}
