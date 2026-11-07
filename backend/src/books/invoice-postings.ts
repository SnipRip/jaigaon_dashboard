// What an issued invoice puts in the books: a Sales voucher, as Tally books
// it (agent/accounts-plan.md, "What each document posts").
//   Local, our state:   Dr customer   Cr Sales - GST Local, Output CGST + SGST
//   Local, other state: Dr customer   Cr Sales - GST Interstate, Output IGST
//   Export under LUT:   Dr customer   Cr Export Sales - LUT
//   Export with IGST:   Dr customer (goods value), IGST Refund Receivable (IGST)
//                       Cr Export Sales - IGST, Output IGST
// Rounding goes to Round Off (a credit when the total was rounded up). The
// cost of the goods is not posted: it leaves closing stock instead
// (closing-stock.ts), as Tally's trading account works. Pure.
import type { LedgerRole, SaleRegime } from '../generated/prisma/enums.js';
import { customerOwes } from '../invoices/invoice-rules.js';
import type { Posting } from './statements.js';
import type { SystemLedgers } from './system-ledgers.js';
import { voucher, type LedgerRef } from './voucher-lines.js';

export interface PostedInvoice {
  regime: SaleRegime;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  roundOff: number;
  total: number;
}

const SALES_LEDGER: Record<SaleRegime, LedgerRole> = {
  INTRA_STATE: 'SALES_LOCAL',
  INTER_STATE: 'SALES_INTERSTATE',
  EXPORT_LUT: 'SALES_EXPORT_LUT',
  EXPORT_IGST: 'SALES_EXPORT_IGST',
  // Bill of supply (we are composition or unregistered): no output tax.
  BILL_OF_SUPPLY: 'SALES_LOCAL',
};

export function invoicePostings(invoice: PostedInvoice, customer: LedgerRef, ledgers: SystemLedgers): Posting[] {
  const owed = customerOwes(invoice);
  return voucher(
    [customer, owed],
    [ledgers('IGST_REFUND'), invoice.total - owed],
    [ledgers(SALES_LEDGER[invoice.regime]), -invoice.taxable],
    [ledgers('OUTPUT_CGST'), -invoice.cgst],
    [ledgers('OUTPUT_SGST'), -invoice.sgst],
    [ledgers('OUTPUT_IGST'), -invoice.igst],
    [ledgers('ROUND_OFF'), -invoice.roundOff],
  );
}
