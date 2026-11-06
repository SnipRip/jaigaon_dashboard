// The system ledgers vouchers post to, found by role so a renamed ledger
// still works (agent/accounts-plan.md, "System ledgers"). The names below
// are the seeded ones, used only when a role's ledger is missing. Pure.
import type { TallyGroupName } from '../common/tally/tally-groups.js';
import type { LedgerRole } from '../generated/prisma/enums.js';
import { SYSTEM_HOMES } from '../ledgers/ledger-rules.js';

export const SEEDED_NAMES: Record<LedgerRole, string> = {
  PROFIT_AND_LOSS: 'Profit & Loss A/c',
  CAPITAL: "Owner's Capital",
  DRAWINGS: 'Drawings',
  SALES_LOCAL: 'Sales - GST Local',
  SALES_INTERSTATE: 'Sales - GST Interstate',
  SALES_EXPORT_LUT: 'Export Sales - LUT',
  SALES_EXPORT_IGST: 'Export Sales - IGST',
  PURCHASE_LOCAL: 'Purchase - GST Local',
  PURCHASE_INTERSTATE: 'Purchase - GST Interstate',
  PURCHASE_NO_ITC: 'Purchase - No Input Credit',
  OUTPUT_CGST: 'Output CGST',
  OUTPUT_SGST: 'Output SGST',
  OUTPUT_IGST: 'Output IGST',
  INPUT_CGST: 'Input CGST',
  INPUT_SGST: 'Input SGST',
  INPUT_IGST: 'Input IGST',
  RCM_CGST: 'CGST Payable on RCM',
  RCM_SGST: 'SGST Payable on RCM',
  RCM_IGST: 'IGST Payable on RCM',
  TDS_PAYABLE: 'TDS Payable on Interest',
  TDS_RECEIVABLE: 'TDS Receivable',
  IGST_REFUND: 'IGST Refund Receivable',
  ROUND_OFF: 'Round Off',
  STOCK_WRITE_OFF: 'Stock Written Off',
  STOCK_FOUND: 'Stock Excess Found',
  STOCK_ADJUSTMENT: 'Stock Adjustment',
  TDS_PAYABLE_VENDOR: 'TDS Payable on Vendor Payments',
};

/** A system ledger as a voucher line names it: the ledger's name, and the group to fall back on. */
export interface SystemLedger {
  ledger: string;
  group: TallyGroupName | 'Primary';
}

export type SystemLedgers = (role: LedgerRole) => SystemLedger;

/** Looks each role up among the general ledgers; the seeded name when none carries it. */
export function systemLedgers(ledgers: { name: string; systemRole: LedgerRole | null }[]): SystemLedgers {
  const byRole = new Map<LedgerRole, string>();
  for (const ledger of ledgers) if (ledger.systemRole) byRole.set(ledger.systemRole, ledger.name);
  return (role) => ({ ledger: byRole.get(role) ?? SEEDED_NAMES[role], group: SYSTEM_HOMES[role] ?? 'Primary' });
}
