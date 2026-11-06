/** GET /sales-settings: how sales screens behave for the whole company. */
export interface SalesSettingsView {
  /** The invoice item picker lists only items with stock in the chosen godown. */
  invoiceInStockOnly: boolean;
  updatedAt: string;
}
