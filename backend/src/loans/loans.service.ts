import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { archivedFilter } from '../common/dto/archivable.js';
import { dateOnly, formatDate, todayInIndia } from '../common/dates.js';
import { definedFields } from '../common/dto/defined-fields.js';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { NumberSeriesService } from '../number-series/number-series.service.js';
import type { CreateLoanDto } from './dto/create-loan.dto.js';
import type { RecordLoanEntryDto } from './dto/record-loan-entry.dto.js';
import type { UpdateLoanDto } from './dto/update-loan.dto.js';
import { SERIES_OF, voucherTypeOf } from './loan-kinds.js';
import { entryProblem, loanProblem, settleLoan } from './loan-rules.js';
import { buildSchedule, emiFor, outstandingOf } from './loan-schedule.js';
import {
  entryFacts,
  LOAN_INCLUDE,
  loanFields,
  termsOf,
  toLoanDetailView,
  toLoanView,
  type LoanDetailView,
  type LoanFields,
  type LoanReminderView,
  type LoanView,
} from './loan-view.js';

type Tx = Prisma.TransactionClient;

// The EMI by the reducing-balance formula, over the instalments still to
// come. Used when none is given; the lender's own figure wins otherwise
// (their rounding differs).
function withEmi(fields: LoanFields, recompute: boolean): LoanFields {
  if (!recompute || fields.repayment !== 'EMI' || !fields.tenureMonths) return fields;
  const balance = fields.openingOutstanding ?? fields.principal;
  const months = fields.tenureMonths - fields.paidBefore;
  return months > 0 ? { ...fields, emiAmount: emiFor(balance, fields.interestRatePct, months) } : fields;
}

// Checks the loan and turns its fields into a row. A reused name fails on
// its unique index (409 "already used").
async function toRow(tx: Tx, loan: LoanFields, accountsChanged: boolean) {
  const problem = loanProblem(loan);
  if (problem) throw new BadRequestException(problem);
  if (accountsChanged) {
    await assertLiveAccount(tx, loan.repaymentAccountId, 'Repayment account');
    if (loan.disbursalAccountId) await assertLiveAccount(tx, loan.disbursalAccountId, 'Account the money went through');
  }
  const day = (date: string | null) => (date ? dateOnly(date) : null);
  return {
    ...loan,
    disbursedOn: dateOnly(loan.disbursedOn),
    firstEmiDate: day(loan.firstEmiDate),
    firstInterestDate: day(loan.firstInterestDate),
    maturityDate: day(loan.maturityDate),
  };
}

async function assertLiveAccount(tx: Tx, id: string, label: string) {
  const account = await tx.bankCashAccount.findUnique({ where: { id } });
  if (!account || account.isArchived) {
    throw new BadRequestException(`${label}: pick a live account from Bank & cash`);
  }
}

const TERMS = ['principal', 'interestRatePct', 'tenureMonths', 'paidBefore', 'openingOutstanding', 'repayment'];

@Injectable()
export class LoansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: NumberSeriesService,
  ) {}

  async list(includeArchived?: boolean): Promise<LoanView[]> {
    const today = todayInIndia();
    const loans = await this.prisma.loan.findMany({
      where: archivedFilter(includeArchived),
      include: LOAN_INCLUDE,
      orderBy: [{ direction: 'asc' }, { name: 'asc' }],
    });
    return loans.map((loan) => toLoanView(loan, today));
  }

  async get(id: string): Promise<LoanDetailView> {
    const loan = await this.prisma.loan.findUniqueOrThrow({ where: { id }, include: LOAN_INCLUDE });
    return toLoanDetailView(loan, todayInIndia());
  }

  /** EMIs, interest and repay-by dates that are overdue or within each live loan's warning days, earliest first. */
  async reminders(): Promise<LoanReminderView[]> {
    const today = todayInIndia();
    const loans = await this.prisma.loan.findMany({ where: { isArchived: false }, include: LOAN_INCLUDE });
    return loans
      .flatMap((loan) =>
        buildSchedule(termsOf(loanFields(loan)), entryFacts(loan), today)
          .filter((row) => row.status === 'OVERDUE' || row.status === 'DUE_SOON')
          .map((row) => ({
            loanId: loan.id,
            loanName: loan.name,
            partyName: loan.partyName,
            direction: loan.direction,
            instalmentNo: row.no,
            kind: row.kind,
            dueDate: row.dueDate,
            amount: row.amount ?? 0,
            status: row.status as LoanReminderView['status'],
            repaymentAccountName: loan.repaymentAccount.name,
          })),
      )
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.loanName.localeCompare(b.loanName));
  }

  create(dto: CreateLoanDto): Promise<LoanDetailView> {
    const fields: LoanFields = {
      name: dto.name,
      direction: dto.direction,
      kind: dto.kind,
      repayment: dto.repayment,
      partyName: dto.partyName,
      loanAccountNumber: dto.loanAccountNumber ?? null,
      isSecured: dto.isSecured,
      security: dto.security ?? null,
      principal: dto.principal,
      interestRatePct: dto.interestRatePct,
      disbursedOn: dto.disbursedOn,
      disbursal: dto.disbursal,
      disbursalAccountId: dto.disbursalAccountId ?? null,
      assetLedgerName: dto.assetLedgerName ?? null,
      paidBefore: dto.paidBefore ?? 0,
      openingOutstanding: dto.openingOutstanding ?? null,
      tenureMonths: dto.tenureMonths ?? null,
      emiAmount: dto.emiAmount ?? null,
      firstEmiDate: dto.firstEmiDate ?? null,
      interestFrequency: dto.interestFrequency ?? null,
      firstInterestDate: dto.firstInterestDate ?? null,
      maturityDate: dto.maturityDate ?? null,
      repaymentAccountId: dto.repaymentAccountId,
      interestLedgerName: dto.interestLedgerName ?? null,
      tdsRatePct: dto.tdsRatePct ?? null,
      tdsLedgerName: dto.tdsLedgerName ?? null,
      reminderDays: dto.reminderDays ?? 3,
      notes: dto.notes ?? null,
      isArchived: false,
    };
    const settled = withEmi(settleLoan(fields, {}), fields.emiAmount === null);
    return this.prisma.$transaction(async (tx) => {
      const loan = await tx.loan.create({ data: await toRow(tx, settled, true), include: LOAN_INCLUDE });
      return toLoanDetailView(loan, todayInIndia());
    });
  }

  update(id: string, dto: UpdateLoanDto): Promise<LoanDetailView> {
    return this.prisma.$transaction(async (tx) => {
      const stored = loanFields(await tx.loan.findUniqueOrThrow({ where: { id }, include: LOAN_INCLUDE }));
      // Fields left out keep their stored value (definedFields).
      const changes = definedFields(dto) as Partial<LoanFields>;
      // A cleared EMI, or new terms without a new EMI, work it out again.
      const recompute = dto.emiAmount === null || (dto.emiAmount === undefined && TERMS.some((key) => key in changes));
      const fields = withEmi(settleLoan(stored, changes), recompute);
      const accountsChanged = 'repaymentAccountId' in changes || 'disbursalAccountId' in changes;
      const loan = await tx.loan.update({
        where: { id },
        data: await toRow(tx, fields, accountsChanged),
        include: LOAN_INCLUDE,
      });
      return toLoanDetailView(loan, todayInIndia());
    });
  }

  // A loan with entries (cancelled ones too) fails with 409; archive it.
  async remove(id: string): Promise<void> {
    await this.prisma.loan.delete({ where: { id } });
  }

  /**
   * Records an entry as its voucher (Payment, Receipt or Journal by the loan's
   * direction and the entry kind). The loan row is locked so two people
   * cannot settle the same row, and the voucher number comes from its series
   * in the same transaction.
   */
  recordEntry(loanId: string, dto: RecordLoanEntryDto): Promise<LoanDetailView> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM "Loan" WHERE "id" = ${loanId}::uuid FOR UPDATE`;
      const loan = await tx.loan.findUniqueOrThrow({ where: { id: loanId }, include: LOAN_INCLUDE });
      const fields = loanFields(loan);
      if (fields.isArchived) throw new BadRequestException('Restore the loan before recording an entry');
      if (dto.entryDate < fields.disbursedOn) {
        throw new BadRequestException(`The loan started on ${formatDate(fields.disbursedOn)}; pick a later date`);
      }
      const entry = {
        kind: dto.kind,
        instalmentNo: dto.instalmentNo ?? null,
        principal: dto.principal ?? 0,
        interest: dto.interest ?? 0,
        tds: dto.tds ?? 0,
        charges: dto.charges ?? 0,
        bankAccountId: dto.bankAccountId ?? null,
      };
      const problem = entryProblem(fields, entry);
      if (problem) throw new BadRequestException(problem);

      const facts = entryFacts(loan);
      if (entry.instalmentNo !== null) {
        const row = buildSchedule(termsOf(fields), facts, todayInIndia()).find((candidate) => candidate.no === entry.instalmentNo);
        const fits =
          row &&
          (entry.kind === 'EMI'
            ? row.kind === 'EMI'
            : row.kind === 'INTEREST' || (row.kind === 'MATURITY' && fields.interestFrequency === 'AT_MATURITY'));
        if (!row || !fits) throw new BadRequestException(`Row ${entry.instalmentNo} of the schedule is not one this entry settles`);
        if (row.status === 'PAID' || row.status === 'PAID_BEFORE_BOOKS') {
          throw new ConflictException(`Row ${entry.instalmentNo} of the schedule is already settled`);
        }
      }
      if (entry.kind === 'EMI' || entry.kind === 'PRINCIPAL') {
        const outstanding = outstandingOf(termsOf(fields), facts);
        if (entry.principal > outstanding) {
          throw new BadRequestException(`Only ₹${outstanding.toFixed(2)} of principal is still owed`);
        }
      }
      if (entry.bankAccountId) await assertLiveAccount(tx, entry.bankAccountId, 'Bank or cash account');

      const id = randomUUID();
      const series = SERIES_OF[voucherTypeOf(fields.direction, entry.kind)];
      const issued = await this.numbers.issue(tx, series, dto.entryDate, {
        typed: dto.voucherNumber ?? undefined,
        documentId: id,
      });
      await tx.loanEntry.create({
        data: {
          id,
          loanId,
          ...entry,
          entryDate: dateOnly(dto.entryDate),
          reference: dto.reference ?? null,
          voucherNumber: issued.number,
          issuedNumberId: issued.id,
        },
      });
      return this.detailIn(tx, loanId);
    });
  }

  /** Cancels an entry made by mistake; its voucher number stays cancelled in the register. */
  cancelEntry(loanId: string, entryId: string): Promise<LoanDetailView> {
    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.loanEntry.findFirst({ where: { id: entryId, loanId } });
      if (!entry) throw new NotFoundException('Record not found');
      if (entry.cancelledAt) throw new ConflictException('This entry is already cancelled');
      await tx.loanEntry.update({ where: { id: entryId }, data: { cancelledAt: new Date() } });
      await this.numbers.cancel(tx, entry.issuedNumberId);
      return this.detailIn(tx, loanId);
    });
  }

  private async detailIn(tx: Tx, id: string) {
    const loan = await tx.loan.findUniqueOrThrow({ where: { id }, include: LOAN_INCLUDE });
    return toLoanDetailView(loan, todayInIndia());
  }
}
