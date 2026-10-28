"use client";

import { StatusChip } from "@/components/ui/status-chip";
import { formatQuantity } from "@/lib/format";
import { RecordMaster } from "./record-master";
import type { Brand } from "./types";

interface BrandsMasterProps {
  brands: Brand[];
  categories: { id: string; name: string }[];
  /** Brand name → items carrying it. */
  itemCounts: Record<string, number>;
}

export function BrandsMaster({ brands, categories, itemCounts }: BrandsMasterProps) {
  const categoryName = (id?: string) => categories.find((category) => category.id === id)?.name ?? "Any";
  return (
    <RecordMaster
      noun={["brand", "brands"]}
      initialRecords={brands}
      nameKey="name"
      blank={{ authorised: false }}
      fields={[
        { key: "name", label: "Brand name", kind: "text", required: true, placeholder: "Hind TMT" },
        { key: "categoryId", label: "Mostly sold in", kind: "select", options: categories.map((category) => ({ value: category.id, label: category.name })) },
        { key: "authorised", label: "Dealership", kind: "toggle", onLabel: "Authorised dealer", offLabel: "Bought in the market", wide: true },
        { key: "notes", label: "Notes", kind: "text", wide: true, placeholder: "Maker, range, contact" },
      ]}
      columns={[
        { label: "Brand", render: (brand) => brand.name },
        { label: "Category", render: (brand) => categoryName(brand.categoryId) },
        {
          label: "Dealership",
          render: (brand) => <StatusChip tone={brand.authorised ? "success" : "neutral"}>{brand.authorised ? "Authorised" : "Market"}</StatusChip>,
        },
        { label: "Notes", render: (brand) => <span className="text-ink-soft">{brand.notes ?? "–"}</span> },
      ]}
      searchText={(brand) => `${brand.name} ${categoryName(brand.categoryId)} ${brand.notes ?? ""}`}
      filters={[
        { label: "Authorised", test: (brand) => brand.authorised },
        { label: "Market", test: (brand) => !brand.authorised },
      ]}
      stats={(records) => [
        { label: "Brands", value: formatQuantity(records.length) },
        { label: "Authorised dealer", value: formatQuantity(records.filter((brand) => brand.authorised).length) },
        { label: "Items with a brand", value: formatQuantity(Object.values(itemCounts).reduce((sum, count) => sum + count, 0)) },
        { label: "Not on any item", value: formatQuantity(records.filter((brand) => !itemCounts[brand.name]).length) },
      ]}
      usage={(brand) => itemCounts[brand.name] ?? 0}
      importColumns={["Brand name", "Category", "Authorised (Y/N)", "Notes"]}
      footnote="Brands are picked on the item form and searched on Rate enquiry. Used in = items carrying the brand."
    />
  );
}
