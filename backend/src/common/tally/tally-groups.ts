// TallyPrime's 28 predefined groups (15 primary, 13 sub-groups), spelt as
// Tally spells them. Every ledger we create goes under one of these, chosen
// by the app from the kind of record, never by the user (masters-plan.md,
// "Simplification rules"; agent/accounts-plan.md).

export type TallyNature = 'Asset' | 'Liability' | 'Income' | 'Expense';

interface TallyGroup {
  /** Null for a primary group. */
  parent: TallyGroupName | null;
  nature: TallyNature;
}

export type TallyGroupName =
  | 'Branch / Divisions'
  | 'Capital Account'
  | 'Current Assets'
  | 'Current Liabilities'
  | 'Direct Expenses'
  | 'Direct Incomes'
  | 'Fixed Assets'
  | 'Indirect Expenses'
  | 'Indirect Incomes'
  | 'Investments'
  | 'Loans (Liability)'
  | 'Misc. Expenses (ASSET)'
  | 'Purchase Accounts'
  | 'Sales Accounts'
  | 'Suspense A/c'
  | 'Bank Accounts'
  | 'Bank OD A/c'
  | 'Cash-in-Hand'
  | 'Deposits (Asset)'
  | 'Duties & Taxes'
  | 'Loans & Advances (Asset)'
  | 'Provisions'
  | 'Reserves & Surplus'
  | 'Secured Loans'
  | 'Stock-in-Hand'
  | 'Sundry Creditors'
  | 'Sundry Debtors'
  | 'Unsecured Loans';

export const TALLY_GROUPS: Record<TallyGroupName, TallyGroup> = {
  'Branch / Divisions': { parent: null, nature: 'Liability' },
  'Capital Account': { parent: null, nature: 'Liability' },
  'Current Assets': { parent: null, nature: 'Asset' },
  'Current Liabilities': { parent: null, nature: 'Liability' },
  'Direct Expenses': { parent: null, nature: 'Expense' },
  'Direct Incomes': { parent: null, nature: 'Income' },
  'Fixed Assets': { parent: null, nature: 'Asset' },
  'Indirect Expenses': { parent: null, nature: 'Expense' },
  'Indirect Incomes': { parent: null, nature: 'Income' },
  Investments: { parent: null, nature: 'Asset' },
  'Loans (Liability)': { parent: null, nature: 'Liability' },
  'Misc. Expenses (ASSET)': { parent: null, nature: 'Asset' },
  'Purchase Accounts': { parent: null, nature: 'Expense' },
  'Sales Accounts': { parent: null, nature: 'Income' },
  'Suspense A/c': { parent: null, nature: 'Liability' },
  'Bank Accounts': { parent: 'Current Assets', nature: 'Asset' },
  'Bank OD A/c': { parent: 'Loans (Liability)', nature: 'Liability' },
  'Cash-in-Hand': { parent: 'Current Assets', nature: 'Asset' },
  'Deposits (Asset)': { parent: 'Current Assets', nature: 'Asset' },
  'Duties & Taxes': { parent: 'Current Liabilities', nature: 'Liability' },
  'Loans & Advances (Asset)': { parent: 'Current Assets', nature: 'Asset' },
  Provisions: { parent: 'Current Liabilities', nature: 'Liability' },
  'Reserves & Surplus': { parent: 'Capital Account', nature: 'Liability' },
  'Secured Loans': { parent: 'Loans (Liability)', nature: 'Liability' },
  'Stock-in-Hand': { parent: 'Current Assets', nature: 'Asset' },
  'Sundry Creditors': { parent: 'Current Liabilities', nature: 'Liability' },
  'Sundry Debtors': { parent: 'Current Assets', nature: 'Asset' },
  'Unsecured Loans': { parent: 'Loans (Liability)', nature: 'Liability' },
};

/** Ledgers the loan entries post to besides the loan, bank and asset. */
export const DEFAULT_INTEREST_LEDGER = 'Interest on Loan';
export const DEFAULT_INTEREST_RECEIVED_LEDGER = 'Interest Received';
export const DEFAULT_TDS_PAYABLE_LEDGER = 'TDS Payable on Interest';
export const DEFAULT_TDS_RECEIVABLE_LEDGER = 'TDS Receivable';
export const BANK_CHARGES_LEDGER = 'Bank Charges';

// Ledger names go to Tally as they are: letters, digits, spaces and common
// punctuation, so "SBI Current A/c - 1234" is fine and nothing breaks the
// Tally import.
export const LEDGER_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 &.,()/'-]{1,59}$/;
export const LEDGER_NAME_MESSAGE = "2 to 60 letters, digits, spaces and & . , ( ) / ' -";
