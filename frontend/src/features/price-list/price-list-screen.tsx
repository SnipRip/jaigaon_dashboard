"use client";

import { useState } from "react";
import useSWR from "swr";
import { LoadNotice } from "@/components/ui/load-notice";
import { CATEGORIES_PATH } from "@/features/items/item-paths";
import { apiGet } from "@/lib/api-client";
import { useToday } from "@/lib/use-today";
import type { CategoryView } from "@/types/item-master";
import type { PriceSheetView } from "@/types/price-list";
import { priceSheetPath } from "./price-list-api";
import { PriceListWorkspace } from "./price-list-workspace";

// The Price list screen: the sheet for the chosen date (today at first) and
// the category tree for the filter.
export function PriceListScreen() {
  const today = useToday();
  const [picked, setPicked] = useState<string | null>(null);
  const date = picked ?? today;
  const sheet = useSWR<PriceSheetView>(date ? priceSheetPath(date) : null, apiGet, { keepPreviousData: true });
  const categories = useSWR<CategoryView[]>(CATEGORIES_PATH, apiGet);

  if (!date || !sheet.data || !categories.data) {
    return <LoadNotice error={sheet.error ?? categories.error} what="the price list" />;
  }
  return (
    <PriceListWorkspace
      sheet={sheet.data}
      categories={categories.data}
      date={date}
      onDateChange={setPicked}
      onSaved={() => sheet.mutate()}
    />
  );
}
