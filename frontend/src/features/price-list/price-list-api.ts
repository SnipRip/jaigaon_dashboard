// Price list calls (backend/src/price-list) and the day sheet download.
import { apiRequest, downloadFile } from "@/lib/api-client";
import type { ItemPriceView } from "@/types/price-list";

export const PRICE_LIST_PATH = "/price-list";
export const PRICE_LIST_MASTER = "price-list";

export const priceSheetPath = (date: string) => `${PRICE_LIST_PATH}/sheet?date=${date}`;
export const itemPricesPath = (itemId: string) => `${PRICE_LIST_PATH}?itemId=${itemId}&includeArchived=true`;

/** One row of a bulk save; leave the price out to work it out from the margin. */
export interface PriceRowInput {
  itemId: string;
  sellingPrice: number;
  costPrice: number | null;
  mrp: number | null;
  minSellingPrice: number | null;
}

export interface PriceDates {
  validFrom: string;
  /** The same as validFrom for that day only. */
  validTill: string;
}

/** Saves every changed row for the same dates: all or none. */
export const saveBulkPrices = (dates: PriceDates, rows: PriceRowInput[]) =>
  apiRequest<{ saved: number }>(`${PRICE_LIST_PATH}/bulk`, { method: "POST", body: { ...dates, rows } });

/** The price-list prices in force on `fromDate`, set again for these dates. */
export const copyPrices = (fromDate: string, dates: PriceDates, itemIds?: string[]) =>
  apiRequest<{ saved: number }>(`${PRICE_LIST_PATH}/copy`, { method: "POST", body: { fromDate, ...dates, itemIds } });

export const setPriceArchived = (id: string, isArchived: boolean) =>
  apiRequest<ItemPriceView>(`${PRICE_LIST_PATH}/${id}`, { method: "PATCH", body: { isArchived } });

export const deletePrice = (id: string) => apiRequest(`${PRICE_LIST_PATH}/${id}`, { method: "DELETE" });

/** Every live item with the price in force that day, dated that day: change the prices, import it back. */
export const downloadDaySheet = (date: string) =>
  downloadFile(`/imports/${PRICE_LIST_MASTER}/sheet?date=${date}`, `price-list-${date}.xlsx`);
