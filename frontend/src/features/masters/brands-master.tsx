"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { LoadNotice } from "@/components/ui/load-notice";
import { StatusChip } from "@/components/ui/status-chip";
import { CATEGORIES_PATH } from "@/features/items/item-paths";
import { apiGet } from "@/lib/api-client";
import { formatQuantity } from "@/lib/format";
import type { BrandView, CategoryView } from "@/types/item-master";
import { BRANDS_PATH, brandPersistence, toBrand, withArchived } from "./masters-api";
import { RecordMaster } from "./record-master";

export function BrandsMaster() {
  const { data, error, mutate } = useSWR<BrandView[]>(withArchived(BRANDS_PATH), apiGet);
  const { data: categories, error: categoryError } = useSWR<CategoryView[]>(CATEGORIES_PATH, apiGet);
  const brands = useMemo(() => data?.map(toBrand), [data]);
  if (!brands || !categories) return <LoadNotice error={error ?? categoryError} what="brands" />;

  const categoryName = (id?: string) => categories.find((category) => category.id === id)?.name ?? "Any";
  return (
    <RecordMaster
      noun={["brand", "brands"]}
      initialRecords={brands}
      persist={brandPersistence(() => void mutate())}
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
        { label: "Items with a brand", value: formatQuantity(records.reduce((sum, brand) => sum + (brand.itemCount ?? 0), 0)) },
        { label: "Not on any item", value: formatQuantity(records.filter((brand) => !brand.itemCount).length) },
      ]}
      usage={(brand) => brand.itemCount ?? 0}
      importColumns={["Brand name", "Category", "Authorised (Y/N)", "Notes"]}
      footnote="Brands are picked on the item form and searched on Rate enquiry. Used in = items carrying the brand."
    />
  );
}
