// What the Rate enquiry screen reads: every live item with its stock and
// the rates it offers this customer on the day.
import type { LineRateOptionsView } from './line-rate-options.service.js';

export interface RateEnquiryItemView {
  itemId: string;
  name: string;
  sku: string;
  /** Inherited: item → group → sub-category → category. */
  unit: string | null;
  categoryId: string;
  categoryName: string;
  subCategoryName: string | null;
  brandName: string | null;
  /** On hand in every godown: opening stock left plus stock batches. */
  stock: number;
  /** 0 = no reorder level set. */
  reorderLevel: number;
  options: LineRateOptionsView;
}

/** Facts about the customer a salesperson checks before quoting. A fact is left out when the role may not open its screen. */
export interface RateEnquiryCustomerView {
  /** What the customer owes now (Payments & outstanding). */
  outstanding?: number;
  /** The latest quotation given to them (not a draft or cancelled one); null when none. */
  lastQuotation?: { id: string; number: string; date: string } | null;
}

export interface RateEnquiryView {
  date: string;
  partyId: string | null;
  customer: RateEnquiryCustomerView | null;
  items: RateEnquiryItemView[];
}
