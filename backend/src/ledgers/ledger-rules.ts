// General ledgers: the ledgers no other master owns (capital, sales,
// purchase, GST, TDS, round off, fixed assets…). The seeded ones carry a
// system role the app posts to (agent/accounts-plan.md, "System ledgers").
import type { TallyGroupName } from '../common/tally/tally-groups.js';
import type { LedgerRole, TaxKind } from '../generated/prisma/enums.js';
import { isWithin, type GroupNode } from './ledger-group-rules.js';

/** Where each system ledger lives; null is Primary (Profit & Loss A/c only). It may move into a sub-group of that group. */
export const SYSTEM_HOMES: Record<LedgerRole, TallyGroupName | null> = {
  PROFIT_AND_LOSS: null,
  CAPITAL: 'Capital Account',
  DRAWINGS: 'Capital Account',
  SALES_LOCAL: 'Sales Accounts',
  SALES_INTERSTATE: 'Sales Accounts',
  SALES_EXPORT_LUT: 'Sales Accounts',
  SALES_EXPORT_IGST: 'Sales Accounts',
  PURCHASE_LOCAL: 'Purchase Accounts',
  PURCHASE_INTERSTATE: 'Purchase Accounts',
  PURCHASE_NO_ITC: 'Purchase Accounts',
  OUTPUT_CGST: 'Duties & Taxes',
  OUTPUT_SGST: 'Duties & Taxes',
  OUTPUT_IGST: 'Duties & Taxes',
  INPUT_CGST: 'Duties & Taxes',
  INPUT_SGST: 'Duties & Taxes',
  INPUT_IGST: 'Duties & Taxes',
  RCM_CGST: 'Duties & Taxes',
  RCM_SGST: 'Duties & Taxes',
  RCM_IGST: 'Duties & Taxes',
  TDS_PAYABLE: 'Duties & Taxes',
  TDS_RECEIVABLE: 'Loans & Advances (Asset)',
  IGST_REFUND: 'Loans & Advances (Asset)',
  ROUND_OFF: 'Indirect Expenses',
  STOCK_WRITE_OFF: 'Indirect Expenses',
  STOCK_FOUND: 'Indirect Incomes',
  // The trading side of an adjustment: takes the stock's cost out of (or into) the goods sold, as Tally credits a purchase ledger.
  STOCK_ADJUSTMENT: 'Purchase Accounts',
  TDS_PAYABLE_VENDOR: 'Duties & Taxes',
};

/** The fields a ledger save looks at, after a change is merged onto the stored ledger. */
export interface LedgerFacts {
  name: string;
  groupId: string | null;
  taxKind: TaxKind | null;
  systemRole: LedgerRole | null;
  isArchived: boolean;
}

/** Null when the ledger fits its group, otherwise the first problem found. */
export function ledgerProblem(ledger: LedgerFacts, groups: Map<string, GroupNode>): string | null {
  if (ledger.groupId === null) {
    return ledger.systemRole === 'PROFIT_AND_LOSS' ? null : 'Pick the group the ledger goes under';
  }
  if (!groups.has(ledger.groupId)) return 'Pick the group the ledger goes under';
  if (ledger.taxKind !== null && !isWithin(groups, ledger.groupId, 'Duties & Taxes')) {
    return 'Only a ledger under Duties & Taxes says which tax it holds';
  }
  const home = ledger.systemRole ? SYSTEM_HOMES[ledger.systemRole] : undefined;
  if (home && !isWithin(groups, ledger.groupId, home)) {
    return `The app posts to "${ledger.name}" as a ${home} ledger; it stays under ${home} or one of its sub-groups`;
  }
  return null;
}

/** System ledgers keep their name (the app and Tally find them by it) and stay live. */
export function systemChangeProblem(stored: LedgerFacts, next: LedgerFacts): string | null {
  if (!stored.systemRole) return null;
  if (next.name !== stored.name) return `The app posts to "${stored.name}": it keeps its name`;
  if (next.isArchived) return `The app posts to "${stored.name}": it cannot be archived`;
  return null;
}
