"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterGroup } from "@/components/ui/filter-group";
import { GlassCard } from "@/components/ui/glass-card";
import { LoadNotice } from "@/components/ui/load-notice";
import { SearchField } from "@/components/ui/search-field";
import { PARTIES_PATH } from "@/features/parties/parties-api";
import { apiGet } from "@/lib/api-client";
import type { PartyView } from "@/types/party";
import type { RateEnquiryItemView, RateEnquiryView } from "@/types/rate-enquiry";
import { CustomerBar } from "./customer-bar";
import { matchesSearch, type DraftLine } from "./enquiry-rules";
import { ProductTable } from "./product-table";
import { QuotationDraft } from "./quotation-draft";
import { rateEnquiryPath } from "./rate-enquiry-api";

const ALL_CATEGORIES = "all";
/** Live customers only: an archived one is not quoted. */
const CUSTOMERS_PATH = `${PARTIES_PATH}?role=customer`;

// Owns the rate-enquiry screen: chosen customer, search, category filter and
// the quantities in the draft. Every rate comes from the backend for the
// chosen customer, so switching customer asks again and re-prices the draft
// (the old rates stay on screen until the new ones arrive).
export function RateEnquiryWorkspace() {
  const [customerId, setCustomerId] = useState<string>();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const customers = useSWR<PartyView[]>(CUSTOMERS_PATH, apiGet);
  const enquiry = useSWR<RateEnquiryView>(rateEnquiryPath(customerId), apiGet, { keepPreviousData: true });
  const items = useMemo(() => enquiry.data?.items ?? [], [enquiry.data]);

  const categories = useMemo(
    () => [...new Map(items.map((item) => [item.categoryId, item.categoryName])).entries()].sort((a, b) => a[1].localeCompare(b[1])),
    [items],
  );

  if (!enquiry.data || !customers.data) return <LoadNotice error={enquiry.error ?? customers.error} what="items and rates" />;

  const visible = items.filter((item) => (category === ALL_CATEGORIES || item.categoryId === category) && matchesSearch(item, query));
  const lines: DraftLine[] = items.filter((item) => item.itemId in quantities).map((item) => ({ item, quantity: quantities[item.itemId] }));
  const customer = customers.data.find((party) => party.id === customerId);
  // Rates on screen belong to the customer they were asked for.
  const current = (enquiry.data.partyId ?? undefined) === customerId;

  const toggleItem = (item: RateEnquiryItemView) =>
    setQuantities(({ [item.itemId]: existing, ...rest }) => (existing === undefined ? { ...rest, [item.itemId]: 1 } : rest));
  const changeQuantity = (itemId: string, quantity: number) => setQuantities((now) => ({ ...now, [itemId]: quantity }));

  return (
    <div className="grid items-start gap-3.5 xl:grid-cols-[2fr_1fr]">
      <div className="flex min-w-0 flex-col gap-3.5">
        <CustomerBar
          customers={customers.data}
          selectedId={customerId}
          onSelect={setCustomerId}
          facts={current ? enquiry.data.customer : null}
          specialRates={current ? items.filter((item) => item.options.specialRate).length : 0}
          loading={!current}
        />

        <GlassCard className="flex flex-col gap-3.5">
          <SearchField
            id="product-search"
            label="Search products"
            value={query}
            onChange={setQuery}
            placeholder="Search by name, SKU, category or brand"
            trailing={`${visible.length} of ${items.length}`}
            prominent
          />

          {categories.length > 1 && (
            <FilterGroup label="Category">
              <FilterChip selected={category === ALL_CATEGORIES} onClick={() => setCategory(ALL_CATEGORIES)}>
                All categories
              </FilterChip>
              {categories.map(([id, name]) => (
                <FilterChip key={id} selected={category === id} onClick={() => setCategory(id)}>
                  {name}
                </FilterChip>
              ))}
            </FilterGroup>
          )}

          <ProductTable items={visible} addedIds={new Set(Object.keys(quantities))} onToggle={toggleItem} empty={items.length === 0} />
          <p className="text-xs font-semibold text-muted">
            Rate = the customer&rsquo;s special rate in force, else today&rsquo;s price list. Cost is the day&rsquo;s cost on the
            price list, else the last landed cost. Taxes and schemes are added on the quotation.
          </p>
        </GlassCard>
      </div>

      <QuotationDraft customerId={customerId} customerName={customer?.displayName ?? "Walk-in customer"} lines={lines} onQuantityChange={changeQuantity} />
    </div>
  );
}
