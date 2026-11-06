// A loan's schedule, worked out from its terms and the entries recorded
// against it (agent/accounts-plan.md). The same arithmetic serves loans we
// take and loans we give.
//
// EMI loans: monthly reducing balance, interest = outstanding × rate / 12,
// rounded to paise. Paid instalments keep their recorded split, a principal
// entry lowers the balance from its date (the EMI stays, the tenure
// shortens), and an unpaid instalment at or after the last planned one
// clears whatever is left.
//
// Flexible loans: one row per interest date (interest on what was owed then,
// for the period) and one for the repay-by date. An interest entry settles
// the row it names; the repay-by row is settled once nothing is owed.
import { addDays, dateOnly, isoDate } from '../common/dates.js';
import type { InterestFrequency, LoanEntryKind, LoanRepayment } from '../generated/prisma/enums.js';
import { FREQUENCY_MONTHS } from './loan-kinds.js';

export const round2 = (value: number) => Math.round(value * 100) / 100;

export interface LoanTerms {
  repayment: LoanRepayment;
  principal: number;
  interestRatePct: number;
  disbursedOn: string;
  /** EMIs paid before these books (EMI loans already running). */
  paidBefore: number;
  /** What was owed when these books start; null: the principal. */
  openingOutstanding: number | null;
  tenureMonths: number | null;
  emiAmount: number | null;
  firstEmiDate: string | null;
  interestFrequency: InterestFrequency | null;
  firstInterestDate: string | null;
  maturityDate: string | null;
  reminderDays: number;
}

/** A live (not cancelled) entry. */
export interface EntryFacts {
  id: string;
  kind: LoanEntryKind;
  instalmentNo: number | null;
  entryDate: string;
  principal: number;
  interest: number;
  tds: number;
}

export type InstalmentStatus = 'PAID_BEFORE_BOOKS' | 'PAID' | 'OVERDUE' | 'DUE_SOON' | 'UPCOMING';

export interface Instalment {
  no: number;
  /** An EMI, a flexible loan's interest date, or its repay-by date. */
  kind: 'EMI' | 'INTEREST' | 'MATURITY';
  dueDate: string;
  /** Null for an EMI paid before these books: its split is in the lender's statement. */
  amount: number | null;
  principal: number | null;
  interest: number | null;
  /** EMI rows: owed once paid. Flexible rows: owed on the date. */
  balance: number | null;
  status: InstalmentStatus;
  entryId: string | null;
}

/** The EMI the reducing-balance formula gives, to the rupee (lenders round the same way). */
export function emiFor(principal: number, interestRatePct: number, months: number): number {
  const rate = interestRatePct / 1200;
  if (rate === 0) return Math.ceil(principal / months);
  const growth = (1 + rate) ** months;
  return Math.round((principal * rate * growth) / (growth - 1));
}

/** The same day `months` later, on the month's last day when it is shorter (31 Jan → 28 Feb). */
export function addMonths(iso: string, months: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return isoDate(target);
}

const monthsBetween = (from: string, to: string) =>
  (dateOnly(to).getTime() - dateOnly(from).getTime()) / (86_400_000 * (365 / 12));

/** The balance the loan starts from: the opening outstanding, or the principal. */
export const startingBalance = (terms: LoanTerms) => terms.openingOutstanding ?? terms.principal;

/**
 * What an entry does to the amount owed. Principal repaid lowers it, more
 * drawn raises it, and interest added to the loan raises it by what is
 * credited (net of any TDS deducted from it).
 */
export function balanceChange(entry: EntryFacts): number {
  switch (entry.kind) {
    case 'EMI':
    case 'PRINCIPAL':
      return -entry.principal;
    case 'DRAWDOWN':
      return entry.principal;
    case 'INTEREST_ADDED':
      return entry.interest - entry.tds;
    case 'INTEREST':
      return 0;
  }
}

/** What is owed now (or before `date`): the starting balance moved by every entry. */
export function outstandingOf(terms: LoanTerms, entries: EntryFacts[], before?: string): number {
  const counted = before ? entries.filter((entry) => entry.entryDate < before) : entries;
  return round2(Math.max(0, counted.reduce((owed, entry) => owed + balanceChange(entry), startingBalance(terms))));
}

function statusOf(dueDate: string, today: string, reminderDays: number): InstalmentStatus {
  if (dueDate < today) return 'OVERDUE';
  return dueDate <= addDays(today, reminderDays) ? 'DUE_SOON' : 'UPCOMING';
}

export function buildSchedule(terms: LoanTerms, entries: EntryFacts[], today: string): Instalment[] {
  return terms.repayment === 'EMI' ? emiSchedule(terms, entries, today) : flexibleSchedule(terms, entries, today);
}

// Enough rows for a loan whose recorded payments fell short of the plan,
// without looping for ever on an EMI that never covers the interest.
const EXTRA_ROWS = 120;

function emiSchedule(terms: LoanTerms, entries: EntryFacts[], today: string): Instalment[] {
  const { firstEmiDate, tenureMonths, emiAmount } = terms;
  if (!firstEmiDate || !tenureMonths || !emiAmount) return [];
  const rows: Instalment[] = [];
  for (let no = 1; no <= terms.paidBefore; no++) {
    rows.push({
      no,
      kind: 'EMI',
      dueDate: addMonths(firstEmiDate, no - 1),
      amount: null,
      principal: null,
      interest: null,
      balance: null,
      status: 'PAID_BEFORE_BOOKS',
      entryId: null,
    });
  }

  const paidEmis = new Map(entries.filter((entry) => entry.kind === 'EMI').map((entry) => [entry.instalmentNo, entry]));
  const prepayments = entries
    .filter((entry) => entry.kind === 'PRINCIPAL')
    .sort((a, b) => a.entryDate.localeCompare(b.entryDate));
  let nextPrepayment = 0;
  let balance = startingBalance(terms);

  for (let no = terms.paidBefore + 1; no <= tenureMonths + EXTRA_ROWS; no++) {
    const dueDate = addMonths(firstEmiDate, no - 1);
    while (nextPrepayment < prepayments.length && prepayments[nextPrepayment].entryDate <= dueDate) {
      balance = round2(balance - prepayments[nextPrepayment++].principal);
    }
    if (balance <= 0) break;

    const paid = paidEmis.get(no);
    let principal: number;
    let interest: number;
    if (paid) {
      ({ principal, interest } = paid);
    } else {
      interest = round2((balance * terms.interestRatePct) / 1200);
      principal = no >= tenureMonths ? balance : round2(Math.min(emiAmount - interest, balance));
      // An EMI that does not cover the interest would never end; stop planning.
      if (principal <= 0) break;
    }
    balance = round2(balance - principal);
    rows.push({
      no,
      kind: 'EMI',
      dueDate,
      amount: round2(principal + interest),
      principal,
      interest,
      balance: Math.max(0, balance),
      status: paid ? 'PAID' : statusOf(dueDate, today, terms.reminderDays),
      entryId: paid?.id ?? null,
    });
  }
  return rows;
}

// With no repay-by date, interest dates are listed this far past today.
const OPEN_ENDED_MONTHS = 12;

function flexibleSchedule(terms: LoanTerms, entries: EntryFacts[], today: string): Instalment[] {
  const rows: Instalment[] = [];
  const settledBy = new Map<number, EntryFacts>();
  for (const entry of entries) {
    if ((entry.kind === 'INTEREST' || entry.kind === 'INTEREST_ADDED') && entry.instalmentNo !== null) {
      settledBy.set(entry.instalmentNo, entry);
    }
  }
  const owedNow = outstandingOf(terms, entries);
  const lastEntry = entries.reduce((latest, entry) => (entry.entryDate > latest ? entry.entryDate : latest), terms.disbursedOn);
  const rate = terms.interestRatePct;
  const frequency = terms.interestFrequency;

  if (frequency && frequency !== 'AT_MATURITY' && terms.firstInterestDate && rate > 0) {
    const months = FREQUENCY_MONTHS[frequency];
    const end = terms.maturityDate ?? addMonths(today, OPEN_ENDED_MONTHS);
    for (let no = 1; ; no++) {
      const dueDate = addMonths(terms.firstInterestDate, (no - 1) * months);
      if (dueDate > end) break;
      const settled = settledBy.get(no);
      // A repaid loan owes no interest for dates after its last entry.
      if (!settled && owedNow === 0 && dueDate > lastEntry) break;
      const balance = outstandingOf(terms, entries, dueDate);
      const interest = settled ? settled.interest : round2((balance * rate * months) / 1200);
      rows.push({
        no,
        kind: 'INTEREST',
        dueDate,
        amount: interest,
        principal: 0,
        interest,
        balance,
        status: settled ? 'PAID' : statusOf(dueDate, today, terms.reminderDays),
        entryId: settled?.id ?? null,
      });
    }
  }

  if (terms.maturityDate) {
    const no = rows.length + 1;
    const settled = settledBy.get(no);
    const atMaturity = frequency === 'AT_MATURITY';
    const interest = !atMaturity
      ? 0
      : settled
        ? settled.interest
        : round2((outstandingOf(terms, entries, terms.maturityDate) * rate * monthsBetween(terms.disbursedOn, terms.maturityDate)) / 1200);
    const done = owedNow === 0 && (!atMaturity || rate === 0 || Boolean(settled));
    rows.push({
      no,
      kind: 'MATURITY',
      dueDate: terms.maturityDate,
      amount: round2(owedNow + interest),
      principal: owedNow,
      interest,
      balance: owedNow,
      status: done ? 'PAID' : statusOf(terms.maturityDate, today, terms.reminderDays),
      entryId: settled?.id ?? null,
    });
  }
  return rows;
}

/** The first row not yet settled, if any. */
export const nextDue = (schedule: Instalment[]) =>
  schedule.find((row) => row.status !== 'PAID' && row.status !== 'PAID_BEFORE_BOOKS') ?? null;
