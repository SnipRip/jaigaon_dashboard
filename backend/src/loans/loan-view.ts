import { isoDate } from '../common/dates.js';
import { toNumber } from '../common/decimal.js';
import type { TallyGroupName } from '../common/tally/tally-groups.js';
import { BANK_CASH_GROUPS } from '../bank-cash-accounts/bank-cash-rules.js';
import type { BankCashAccount, Prisma } from '../generated/prisma/client.js';
import type { LoanDirection, LoanEntryKind } from '../generated/prisma/enums.js';
import { assetLedger, interestLedger, loanGroup, tdsLedger, type LedgerRef } from './loan-kinds.js';
import { entryVoucher, firstEntry, type Voucher } from './loan-postings.js';
import {
  buildSchedule,
  nextDue,
  outstandingOf,
  round2,
  type EntryFacts,
  type Instalment,
  type LoanTerms,
} from './loan-schedule.js';

/** What every loan read loads with it. */
export const LOAN_INCLUDE = {
  repaymentAccount: true,
  disbursalAccount: true,
  interestHead: true,
  assetLedger: { include: { group: true } },
  tdsLedger: { include: { group: true } },
  entries: { include: { bankAccount: true }, orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }] },
} as const satisfies Prisma.LoanInclude;

export type LoanRecord = Prisma.LoanGetPayload<{ include: typeof LOAN_INCLUDE }>;

const dateOrNull = (date: Date | null) => (date ? isoDate(date) : null);

/** The stored fields as plain values, the shape the rules and updates work on. */
export const loanFields = (loan: LoanRecord) => ({
  name: loan.name,
  direction: loan.direction,
  kind: loan.kind,
  repayment: loan.repayment,
  partyName: loan.partyName,
  loanAccountNumber: loan.loanAccountNumber,
  isSecured: loan.isSecured,
  security: loan.security,
  principal: toNumber(loan.principal),
  interestRatePct: toNumber(loan.interestRatePct),
  disbursedOn: isoDate(loan.disbursedOn),
  disbursal: loan.disbursal,
  disbursalAccountId: loan.disbursalAccountId,
  assetLedgerId: loan.assetLedgerId,
  paidBefore: loan.paidBefore,
  openingOutstanding: toNumber(loan.openingOutstanding),
  tenureMonths: loan.tenureMonths,
  emiAmount: toNumber(loan.emiAmount),
  firstEmiDate: dateOrNull(loan.firstEmiDate),
  interestFrequency: loan.interestFrequency,
  firstInterestDate: dateOrNull(loan.firstInterestDate),
  maturityDate: dateOrNull(loan.maturityDate),
  repaymentAccountId: loan.repaymentAccountId,
  interestHeadId: loan.interestHeadId,
  tdsRatePct: toNumber(loan.tdsRatePct),
  tdsLedgerId: loan.tdsLedgerId,
  reminderDays: loan.reminderDays,
  notes: loan.notes,
  isArchived: loan.isArchived,
});

export type LoanFields = ReturnType<typeof loanFields>;

export const bankLedger = (account: BankCashAccount): LedgerRef => ({
  ledger: account.tallyLedgerName ?? account.name,
  group: BANK_CASH_GROUPS[account.kind],
});

export const entryFacts = (loan: LoanRecord): EntryFacts[] =>
  loan.entries
    .filter((entry) => !entry.cancelledAt)
    .map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      instalmentNo: entry.instalmentNo,
      entryDate: isoDate(entry.entryDate),
      principal: toNumber(entry.principal),
      interest: toNumber(entry.interest),
      tds: toNumber(entry.tds),
    }));

export const termsOf = (fields: LoanFields): LoanTerms => ({
  repayment: fields.repayment,
  principal: fields.principal,
  interestRatePct: fields.interestRatePct,
  disbursedOn: fields.disbursedOn,
  paidBefore: fields.paidBefore,
  openingOutstanding: fields.openingOutstanding,
  tenureMonths: fields.tenureMonths,
  emiAmount: fields.emiAmount,
  firstEmiDate: fields.firstEmiDate,
  interestFrequency: fields.interestFrequency,
  firstInterestDate: fields.firstInterestDate,
  maturityDate: fields.maturityDate,
  reminderDays: fields.reminderDays,
});

/** A loan in the list: its terms plus where it stands today. */
export interface LoanView extends LoanFields {
  id: string;
  repaymentAccountName: string;
  /** The ledger interest posts to: the loan's head, else the direction's default. */
  interestLedger: LedgerRef;
  /** Where TDS on interest posts: the loan's ledger, else TDS Payable on Interest / TDS Receivable. */
  tdsLedger: LedgerRef;
  /** PAID_TO_SELLER: the Fixed Assets ledger. */
  assetLedger: LedgerRef | null;
  tallyGroup: TallyGroupName;
  outstanding: number;
  /** Principal repaid (taken) or recovered (given) through entries here. */
  principalRepaid: number;
  /** Interest paid or received here, gross of TDS, including interest added. */
  interestTotal: number;
  nextDue: Instalment | null;
  overdueCount: number;
  status: 'ACTIVE' | 'CLOSED';
}

export interface LoanEntryView {
  id: string;
  kind: LoanEntryKind;
  instalmentNo: number | null;
  entryDate: string;
  principal: number;
  interest: number;
  tds: number;
  charges: number;
  bankAccountId: string | null;
  bankAccountName: string | null;
  reference: string | null;
  voucherNumber: string;
  cancelledAt: string | null;
  voucher: Voucher;
}

/** One loan with its schedule, entries and Tally vouchers. */
export interface LoanDetailView extends LoanView {
  schedule: Instalment[];
  entries: LoanEntryView[];
  firstEntry: Voucher;
}

/** A scheduled row that is overdue or falls within its loan's warning days. */
export interface LoanReminderView {
  loanId: string;
  loanName: string;
  partyName: string;
  direction: LoanDirection;
  instalmentNo: number;
  kind: Instalment['kind'];
  dueDate: string;
  amount: number;
  status: 'OVERDUE' | 'DUE_SOON';
  repaymentAccountName: string;
}

export function toLoanView(loan: LoanRecord, today: string): LoanView {
  const fields = loanFields(loan);
  const facts = entryFacts(loan);
  const schedule = buildSchedule(termsOf(fields), facts, today);
  const outstanding = outstandingOf(termsOf(fields), facts);
  const repaid = facts.filter((entry) => entry.kind === 'EMI' || entry.kind === 'PRINCIPAL');
  const sum = (entries: EntryFacts[], key: 'principal' | 'interest') =>
    round2(entries.reduce((total, entry) => total + entry[key], 0));
  const due = nextDue(schedule);
  return {
    id: loan.id,
    ...fields,
    repaymentAccountName: loan.repaymentAccount.name,
    interestLedger: interestLedger(loan),
    tdsLedger: tdsLedger(loan),
    assetLedger: loan.assetLedger ? assetLedger(loan.assetLedger) : null,
    tallyGroup: loanGroup(loan),
    outstanding,
    principalRepaid: sum(repaid, 'principal'),
    interestTotal: sum(facts, 'interest'),
    // A repaid loan has nothing due unless interest is still unsettled.
    nextDue: outstanding > 0 || due?.kind === 'INTEREST' ? due : null,
    overdueCount: schedule.filter((row) => row.status === 'OVERDUE').length,
    status: outstanding > 0 ? 'ACTIVE' : 'CLOSED',
  };
}

export function toLoanDetailView(loan: LoanRecord, today: string): LoanDetailView {
  const view = toLoanView(loan, today);
  const loanLedger: LedgerRef = { ledger: loan.name, group: view.tallyGroup };
  const counterpart =
    loan.disbursal === 'THROUGH_BANK' && loan.disbursalAccount
      ? bankLedger(loan.disbursalAccount)
      : loan.disbursal === 'PAID_TO_SELLER'
        ? view.assetLedger
        : null;
  return {
    ...view,
    schedule: buildSchedule(termsOf(view), entryFacts(loan), today),
    entries: loan.entries.map((entry) => {
      const amounts = {
        principal: toNumber(entry.principal),
        interest: toNumber(entry.interest),
        tds: toNumber(entry.tds),
        charges: toNumber(entry.charges),
      };
      return {
        id: entry.id,
        kind: entry.kind,
        instalmentNo: entry.instalmentNo,
        entryDate: isoDate(entry.entryDate),
        ...amounts,
        bankAccountId: entry.bankAccountId,
        bankAccountName: entry.bankAccount?.name ?? null,
        reference: entry.reference,
        voucherNumber: entry.voucherNumber,
        cancelledAt: entry.cancelledAt?.toISOString() ?? null,
        voucher: entryVoucher({
          ...amounts,
          direction: loan.direction,
          kind: entry.kind,
          date: isoDate(entry.entryDate),
          voucherNumber: entry.voucherNumber,
          loanLedger,
          interestLedger: view.interestLedger,
          tdsLedger: view.tdsLedger,
          bank: entry.bankAccount ? bankLedger(entry.bankAccount) : null,
        }),
      };
    }),
    firstEntry: firstEntry({ ...view, loanLedger, counterpart }),
  };
}
