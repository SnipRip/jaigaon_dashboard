// The day-wise price list as the backend returns it (backend/src/price-list).

/** What an entry's blank MRP and cost fall back to. The item has no selling price of its own. */
export interface ItemMasterPricesView {
  mrp: number | null;
  /** The item's last landed cost, worked out from its stock; null before any stock. */
  costPrice: number | null;
}

export interface ItemPriceView {
  id: string;
  itemId: string;
  validFrom: string;
  /** The same as validFrom for a single day. */
  validTill: string;
  sellingPrice: number;
  /** Null: the item master's. */
  mrp: number | null;
  minSellingPrice: number | null;
  costPrice: number | null;
  notes: string | null;
  isArchived: boolean;
  updatedAt: string;
  createdAt: string;
  /** Who saved it last. */
  updatedBy: string | null;
}

/** One item on the price list for a date. */
export interface PriceSheetRowView {
  itemId: string;
  name: string;
  sku: string;
  unit: string | null;
  categoryId: string;
  subCategoryId: string | null;
  item: ItemMasterPricesView;
  /** In force on the date; null means the item master price applies. */
  entry: ItemPriceView | null;
  /** Other live entries covering the date that `entry` overrides. */
  overridden: number;
}

export interface PriceSheetView {
  date: string;
  rows: PriceSheetRowView[];
}
