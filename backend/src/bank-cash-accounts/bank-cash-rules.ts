// How a bank or cash account's fields fit together. The CHECK constraints in
// migration 20261103051950_bank_cash_accounts hold the same rules.
import type { TallyGroupName } from '../common/tally/tally-groups.js';
import { BankCashKind } from '../generated/prisma/enums.js';

/** Tally group each kind's ledger sits under, for the later sync. */
export const BANK_CASH_GROUPS: Record<BankCashKind, TallyGroupName> = {
  BANK: 'Bank Accounts',
  OVERDRAFT: 'Bank OD A/c',
  CASH: 'Cash-in-Hand',
};

/** Fields a cash account never has. */
export const BANK_FIELDS = ['bankName', 'branch', 'accountNumber', 'ifsc', 'upiId'] as const;

/** The fields the rules look at, after an update is merged onto the stored account. */
export interface AccountFacts {
  kind: BankCashKind;
  bankName: string | null;
  branch: string | null;
  accountNumber: string | null;
  ifsc: string | null;
  upiId: string | null;
  openingBalance: number;
  showOnInvoice: boolean;
  isArchived: boolean;
}

/**
 * Applies what a change implies: turning an account into cash clears the
 * bank fields the change did not send, and archiving takes it off invoices.
 */
export function settleAccount<T extends AccountFacts>(stored: T, changes: Partial<T>): T {
  const account: T = { ...stored, ...changes };
  if (account.kind === BankCashKind.CASH && stored.kind !== BankCashKind.CASH) {
    for (const field of BANK_FIELDS) {
      if (changes[field] === undefined) account[field] = null as T[typeof field];
    }
  }
  if (changes.isArchived) account.showOnInvoice = false;
  return account;
}

/** Null when the account is consistent, otherwise the first problem found. */
export function accountProblem(account: AccountFacts): string | null {
  if (account.kind === BankCashKind.CASH) {
    if (BANK_FIELDS.some((field) => account[field] !== null)) {
      return 'A cash account has no bank details';
    }
    if (account.showOnInvoice) return 'Only a bank account can print on invoices';
  } else if (!account.bankName || !account.accountNumber || !account.ifsc) {
    return 'A bank account needs the bank name, account number and IFSC';
  }
  if (account.openingBalance < 0 && account.kind !== BankCashKind.OVERDRAFT) {
    return 'Only an overdraft or cash credit account can open below zero';
  }
  if (account.showOnInvoice && account.isArchived) {
    return 'An archived account cannot print on invoices';
  }
  return null;
}
