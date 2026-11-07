// The Rate enquiry as the backend returns it (backend/src/pricing/rate-enquiry-views.ts).
import type { LineRateOptionsView } from "./pricing";

export interface RateEnquiryItemView {
  itemId: string;
  name: string;
  sku: string | null;
  unit: string | null;
  categoryId: string;
  categoryName: string;
  subCategoryName: string | null;
  brandName: string | null;
  stock: number;
  reorderLevel: number;
  options: LineRateOptionsView;
}

/** A fact is missing when the role may not open its screen. */
export interface RateEnquiryCustomerView {
  outstanding?: number;
  lastQuotation?: { id: string; number: string; date: string } | null;
}

export interface RateEnquiryView {
  date: string;
  partyId: string | null;
  customer: RateEnquiryCustomerView | null;
  items: RateEnquiryItemView[];
}
