// Closing stock at cost on a date, from what moved up to it: the items'
// opening stock, plus what open goods bills brought in (landed: taxable
// value, GST we cannot claim, the bill's own freight), plus freight and
// labour bills added to a purchase (on their own date), plus stock
// adjustments added, less written off, less the cost of goods on issued
// invoices (their FIFO draws). Transfers move stock between godowns at cost
// and change nothing. This is the same figure the stock batches hold today,
// worked out from documents so any past date can be shown (paise of
// rounding apart: batches value stock at a rate to 4 decimals). Pure.
import { round2 } from '../loans/loan-schedule.js';

export interface StockFlows {
  opening: number;
  /** Cost of open goods bills and of open charges bills added to them. */
  purchased: number;
  /** Stock adjustments: added less written off (stockAdjustmentPostings' closingChange). */
  adjusted: number;
  /** Cost of goods on issued invoices. */
  sold: number;
}

export const closingStock = (flows: StockFlows) => round2(flows.opening + flows.purchased + flows.adjusted - flows.sold);
