import { describe, expect, it } from 'vitest';
import {
  addMonths,
  buildSchedule,
  emiFor,
  nextDue,
  outstandingOf,
  round2,
  type EntryFacts,
  type LoanTerms,
} from './loan-schedule.js';

// ₹10 lakh at 9% for 5 years: the textbook EMI is ₹20,758.
const emiLoan: LoanTerms = {
  repayment: 'EMI',
  principal: 1_000_000,
  interestRatePct: 9,
  disbursedOn: '2025-12-20',
  paidBefore: 0,
  openingOutstanding: null,
  tenureMonths: 60,
  emiAmount: 20_758,
  firstEmiDate: '2026-01-05',
  interestFrequency: null,
  firstInterestDate: null,
  maturityDate: null,
  reminderDays: 3,
};

// A gold loan: ₹3 lakh at 12%, interest monthly, principal by 30 June 2027.
const goldLoan: LoanTerms = {
  ...emiLoan,
  repayment: 'FLEXIBLE',
  principal: 300_000,
  interestRatePct: 12,
  disbursedOn: '2026-07-01',
  tenureMonths: null,
  emiAmount: null,
  firstEmiDate: null,
  interestFrequency: 'MONTHLY',
  firstInterestDate: '2026-08-01',
  maturityDate: '2027-06-30',
};

const entry = (fields: Partial<EntryFacts> & Pick<EntryFacts, 'kind' | 'entryDate'>): EntryFacts => ({
  id: `${fields.kind}-${fields.entryDate}`,
  instalmentNo: null,
  principal: 0,
  interest: 0,
  tds: 0,
  ...fields,
});

const sum = (values: (number | null)[]) => round2(values.reduce<number>((total, value) => total + (value ?? 0), 0));

describe('emiFor', () => {
  it('matches the reducing-balance formula', () => {
    expect(emiFor(1_000_000, 9, 60)).toBe(20_758);
    expect(emiFor(500_000, 10.5, 36)).toBe(16_251);
  });

  it('splits evenly at zero interest (a staff advance recovered monthly)', () => {
    expect(emiFor(120_000, 0, 12)).toBe(10_000);
  });
});

describe('addMonths', () => {
  it('keeps the day, or the last day of a shorter month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15');
  });
});

describe('EMI schedule', () => {
  it('plans every EMI and clears the loan on the last one', () => {
    const rows = buildSchedule(emiLoan, [], '2025-12-01');
    expect(rows).toHaveLength(60);
    expect(rows[0]).toMatchObject({ no: 1, kind: 'EMI', dueDate: '2026-01-05', interest: 7500, principal: 13_258, amount: 20_758 });
    expect(rows[59].balance).toBe(0);
    expect(sum(rows.map((row) => row.principal))).toBe(1_000_000);
  });

  it('marks overdue, due soon and upcoming against today', () => {
    const rows = buildSchedule(emiLoan, [], '2026-02-03');
    expect(rows.slice(0, 3).map((row) => row.status)).toEqual(['OVERDUE', 'DUE_SOON', 'UPCOMING']);
    expect(nextDue(rows)?.no).toBe(1);
  });

  it('keeps the split of a recorded EMI and moves on', () => {
    const paid = [entry({ kind: 'EMI', instalmentNo: 1, entryDate: '2026-01-05', principal: 13_000, interest: 7758 })];
    const rows = buildSchedule(emiLoan, paid, '2026-02-03');
    expect(rows[0]).toMatchObject({ status: 'PAID', principal: 13_000, balance: 987_000 });
    expect(rows[1].interest).toBe(round2((987_000 * 9) / 1200));
    expect(outstandingOf(emiLoan, paid)).toBe(987_000);
  });

  it('shortens the loan after a prepayment, keeping the EMI', () => {
    const rows = buildSchedule(emiLoan, [entry({ kind: 'PRINCIPAL', entryDate: '2026-01-20', principal: 300_000 })], '2025-12-01');
    expect(rows.length).toBeLessThan(60);
    expect(rows[1].amount).toBe(20_758);
    expect(rows.at(-1)?.balance).toBe(0);
    expect(sum(rows.map((row) => row.principal))).toBe(700_000);
  });

  it('starts a running loan from its opening outstanding', () => {
    const running = { ...emiLoan, paidBefore: 24, openingOutstanding: 658_000 };
    const rows = buildSchedule(running, [], '2025-12-01');
    expect(rows.slice(0, 24).every((row) => row.status === 'PAID_BEFORE_BOOKS' && row.amount === null)).toBe(true);
    expect(rows[24]).toMatchObject({ no: 25, dueDate: '2028-01-05', interest: round2((658_000 * 9) / 1200) });
    expect(sum(rows.map((row) => row.principal))).toBe(658_000);
  });

  it('stops planning when the EMI does not cover the interest', () => {
    expect(buildSchedule({ ...emiLoan, emiAmount: 7000 }, [], '2025-12-01')).toHaveLength(0);
  });
});

describe('flexible schedule', () => {
  it('lists each interest date and the repay-by date', () => {
    const rows = buildSchedule(goldLoan, [], '2026-07-15');
    expect(rows).toHaveLength(12);
    expect(rows[0]).toMatchObject({ no: 1, kind: 'INTEREST', dueDate: '2026-08-01', interest: 3000, principal: 0, balance: 300_000 });
    expect(rows[10].dueDate).toBe('2027-06-01');
    expect(rows[11]).toMatchObject({ no: 12, kind: 'MATURITY', dueDate: '2027-06-30', principal: 300_000, interest: 0 });
  });

  it('settles a period by its interest entry and works later interest on what is owed', () => {
    const entries = [
      entry({ kind: 'INTEREST', instalmentNo: 1, entryDate: '2026-08-01', interest: 2950 }),
      entry({ kind: 'PRINCIPAL', entryDate: '2026-08-20', principal: 100_000 }),
    ];
    const rows = buildSchedule(goldLoan, entries, '2026-09-10');
    expect(rows[0]).toMatchObject({ status: 'PAID', interest: 2950 });
    expect(rows[1]).toMatchObject({ dueDate: '2026-09-01', interest: 2000, status: 'OVERDUE' });
    expect(nextDue(rows)?.no).toBe(2);
    expect(outstandingOf(goldLoan, entries)).toBe(200_000);
  });

  it('adds drawdowns and interest credited to the loan, net of TDS', () => {
    const owner = { ...goldLoan, interestFrequency: 'YEARLY' as const, firstInterestDate: '2027-03-31', maturityDate: null, interestRatePct: 10 };
    const entries = [
      entry({ kind: 'DRAWDOWN', entryDate: '2026-10-01', principal: 200_000 }),
      entry({ kind: 'INTEREST_ADDED', instalmentNo: 1, entryDate: '2027-03-31', interest: 40_000, tds: 4_000 }),
    ];
    expect(outstandingOf(owner, entries)).toBe(536_000);
    const rows = buildSchedule(owner, entries, '2027-04-10');
    expect(rows[0]).toMatchObject({ status: 'PAID', interest: 40_000 });
    // Open-ended: interest dates a year past today, nothing to repay by.
    expect(rows.map((row) => row.kind)).toEqual(['INTEREST', 'INTEREST']);
    expect(rows[1]).toMatchObject({ dueDate: '2028-03-31', interest: 53_600 });
  });

  it('charges interest once at the end when it is due at maturity', () => {
    const deposit = { ...goldLoan, interestFrequency: 'AT_MATURITY' as const, firstInterestDate: null, interestRatePct: 6, maturityDate: '2027-07-01' };
    const rows = buildSchedule(deposit, [], '2026-07-15');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: 'MATURITY', principal: 300_000 });
    expect(rows[0].interest).toBeCloseTo(18_000, -2);
  });

  it('has no rows for an interest-free loan repayable on demand', () => {
    expect(buildSchedule({ ...goldLoan, interestRatePct: 0, interestFrequency: null, firstInterestDate: null, maturityDate: null }, [], '2026-07-15')).toEqual([]);
  });

  it('settles the repay-by date once nothing is owed', () => {
    const repaid = [entry({ kind: 'PRINCIPAL', entryDate: '2026-12-01', principal: 300_000 })];
    const rows = buildSchedule(goldLoan, repaid, '2027-01-10');
    expect(rows.at(-1)).toMatchObject({ kind: 'MATURITY', status: 'PAID', principal: 0 });
    // No interest falls due after the loan was repaid.
    expect(rows.filter((row) => row.kind === 'INTEREST').every((row) => row.dueDate <= '2026-12-01')).toBe(true);
  });
});
