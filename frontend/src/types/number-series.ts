// A number series as the backend returns it (backend/src/number-series).

/** The backend's document types (SeriesDocument in prisma/schema.prisma). */
export type SeriesDocument =
  | "QUOTATION"
  | "SALES_INVOICE"
  | "EXPORT_INVOICE"
  | "PURCHASE"
  | "RECEIPT"
  | "PAYMENT"
  | "CREDIT_NOTE"
  | "DEBIT_NOTE"
  | "STOCK_JOURNAL"
  | "SHIPMENT"
  | "EXPENSE";

export interface NumberSeriesView {
  id: string;
  document: SeriesDocument;
  /** "2026-27". */
  financialYear: string;
  prefix: string;
  nextNumber: number;
  padding: number;
  /** 0 until a document takes a number. */
  lastIssued: number;
  /** "INV/2627/0009": the number the next document takes. */
  preview: string;
}
