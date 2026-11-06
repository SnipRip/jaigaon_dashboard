import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { HEAD_GROUPS } from '../account-heads/account-head-rules.js';
import { BANK_CASH_GROUPS } from '../bank-cash-accounts/bank-cash-rules.js';
import { expensePostings, expenseVoucherType } from '../books/expense-postings.js';
import { systemLedgers } from '../books/system-ledgers.js';
import { dateOnly, isoDate, todayInIndia } from '../common/dates.js';
import { toNumber } from '../common/decimal.js';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { NumberSeriesService } from '../number-series/number-series.service.js';
import { landBill } from '../purchases/landed-cost.js';
import { companyState, liveVendor } from '../purchases/purchase-context.js';
import { billDueDays, billTax, type BillTax } from '../purchases/purchase-rules.js';
import { accountProblem, dateProblem } from '../settlements/settlement-rules.js';
import { liveSettlementNumbers, settledOf } from '../settlements/settlements.service.js';
import type { CreateExpenseDto, ExpenseQueryDto } from './dto/expense.dto.js';
import { allocationProblem, expenseFigures, headProblem, PAYEE_TAX, payeeProblem, paymentProblem, vendorTaxProblem } from './expense-rules.js';
import { expenseInclude, toExpenseView, type ExpenseRow, type ExpenseView } from './expense-views.js';

type Tx = Prisma.TransactionClient;

const fail = (message: string | null) => {
  if (message) throw new BadRequestException(message);
};
const addDays = (iso: string, days: number) => isoDate(new Date(dateOnly(iso).getTime() + days * 86_400_000));

// Expenses. In one transaction: the head is locked FOR SHARE (it cannot be
// archived or turned into income meanwhile), the vendor row FOR UPDATE (as
// payments to it do), the goods bill or invoice the cost lands on FOR
// UPDATE (so a void or cancel waits); GST comes from the vendor and the
// head; the number from the EXPENSE series. An expense on a purchase's items
// re-works that bill's landed cost (landBill). Never edited: cancel and
// enter again; one on credit cannot be cancelled while payments settle it.
@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: NumberSeriesService,
  ) {}

  async list(query: ExpenseQueryDto): Promise<ExpenseView[]> {
    const rows = await this.prisma.expense.findMany({
      where: { vendorId: query.vendorId, allocation: query.allocation, billId: query.billId, invoiceId: query.invoiceId },
      include: expenseInclude,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    const settled = await settledOf(this.prisma, rows.filter((row) => !row.accountId).map((row) => ({ kind: 'EXPENSE', id: row.id })));
    return rows.map((row) => toExpenseView(row, settled.get(row.id) ?? 0));
  }

  /** One expense with the voucher it posts. */
  async get(id: string): Promise<ExpenseView> {
    const row = await this.prisma.expense.findUnique({ where: { id }, include: expenseInclude });
    if (!row) throw new NotFoundException('That expense does not exist');
    return this.withVoucher(this.prisma, row);
  }

  create(dto: CreateExpenseDto, userId: string): Promise<ExpenseView> {
    return this.prisma.$transaction(async (tx) => {
      const today = todayInIndia();
      const vendorId = dto.vendorId ?? null;
      const accountId = dto.accountId ?? null;
      const mode = dto.mode ?? null;
      const targetId = dto.targetId ?? null;
      fail(payeeProblem(vendorId, dto.payee ?? null));
      fail(paymentProblem({ accountId, mode, vendorId }));
      if (dto.date > today) fail('The date is after today');

      await tx.$queryRaw`SELECT 1 FROM "AccountHead" WHERE "id" = ${dto.headId}::uuid FOR SHARE`;
      const found = await tx.accountHead.findUnique({ where: { id: dto.headId } });
      const head = found && { ...found, gstRatePct: found.gstRatePct === null ? null : toNumber(found.gstRatePct) };
      fail(headProblem(head));
      fail(allocationProblem(head!, dto.allocation, targetId));

      let tax: BillTax = dto.gstBill === false ? PAYEE_TAX.NO_BILL : PAYEE_TAX.GST_BILL;
      let dueDate: string | null = null;
      if (vendorId) {
        await tx.$queryRaw`SELECT 1 FROM "Party" WHERE "id" = ${vendorId}::uuid FOR UPDATE`;
        const vendor = await liveVendor(tx, vendorId);
        tax = billTax(await companyState(tx), vendor, null);
        fail(vendorTaxProblem(tax));
        if (!accountId) dueDate = addDays(dto.date, billDueDays(vendor));
      }

      if (accountId && mode) {
        const account = await tx.bankCashAccount.findUnique({ where: { id: accountId }, select: { kind: true, isArchived: true, openingDate: true } });
        fail(accountProblem(mode, account));
        fail(dateProblem(dto.date, isoDate(account!.openingDate), today));
      }

      if (dto.allocation === 'ITEM_COST') {
        const [bill] = await tx.$queryRaw<{ kind: string; status: string; reference: string }[]>`
          SELECT "kind", "status", "reference" FROM "PurchaseBill" WHERE "id" = ${targetId}::uuid FOR UPDATE`;
        if (!bill || bill.kind !== 'GOODS') fail('Add the cost to a goods bill');
        if (bill.status !== 'OPEN') fail(`Bill ${bill.reference} is void`);
      }
      if (dto.allocation === 'INVOICE') {
        const [invoice] = await tx.$queryRaw<{ status: string; number: string }[]>`
          SELECT "status", "number" FROM "Invoice" WHERE "id" = ${targetId}::uuid FOR UPDATE`;
        if (!invoice) fail('That invoice does not exist');
        if (invoice.status !== 'ISSUED') fail(`Invoice ${invoice.number} is cancelled`);
      }

      const figures = expenseFigures(dto.amount, tax, head!, dto.gstRatePct ?? 0, dto.itcEligible !== false);
      const id = randomUUID();
      const issued = await this.numbers.issue(tx, 'EXPENSE', dto.date, { typed: dto.number ?? undefined, documentId: id });
      await tx.expense.create({
        data: {
          id,
          number: issued.number,
          issuedNumberId: issued.id,
          date: dateOnly(dto.date),
          headId: dto.headId,
          description: dto.description,
          reference: dto.reference ?? null,
          vendorId,
          payee: vendorId ? null : (dto.payee ?? null),
          accountId,
          mode,
          dueDate: dueDate ? dateOnly(dueDate) : null,
          amount: dto.amount,
          ...figures,
          allocation: dto.allocation,
          billId: dto.allocation === 'ITEM_COST' ? targetId : null,
          invoiceId: dto.allocation === 'INVOICE' ? targetId : null,
          notes: dto.notes ?? null,
          createdById: userId,
        },
      });
      if (dto.allocation === 'ITEM_COST') await landBill(tx, targetId!);
      return this.withVoucher(tx, await tx.expense.findUniqueOrThrow({ where: { id }, include: expenseInclude }));
    });
  }

  /** Cancels an expense entered by mistake: it posts nothing, its number stays cancelled, a purchase it landed on is re-worked. */
  cancel(id: string, reason: string): Promise<ExpenseView> {
    return this.prisma.$transaction(async (tx) => {
      const [expense] = await tx.$queryRaw<{ issuedNumberId: string; cancelledAt: Date | null; billId: string | null }[]>`
        SELECT "issuedNumberId", "cancelledAt", "billId" FROM "Expense" WHERE "id" = ${id}::uuid FOR UPDATE`;
      if (!expense) throw new NotFoundException('That expense does not exist');
      if (expense.cancelledAt) throw new ConflictException('This expense is already cancelled');
      const payments = await liveSettlementNumbers(tx, { expenseId: id });
      if (payments.length) throw new ConflictException(`Payments are applied to this expense (${payments.join(', ')}). Cancel them first.`);
      if (expense.billId) await tx.$queryRaw`SELECT 1 FROM "PurchaseBill" WHERE "id" = ${expense.billId}::uuid FOR UPDATE`;
      await this.numbers.cancel(tx, expense.issuedNumberId);
      await tx.expense.update({ where: { id }, data: { cancelledAt: new Date(), cancelReason: reason } });
      if (expense.billId) await landBill(tx, expense.billId);
      return this.withVoucher(tx, await tx.expense.findUniqueOrThrow({ where: { id }, include: expenseInclude }));
    });
  }

  /** The view with what is settled and the voucher it posts (none once cancelled). */
  private async withVoucher(db: Tx | PrismaService, row: ExpenseRow): Promise<ExpenseView> {
    const settled = row.accountId ? 0 : ((await settledOf(db, [{ kind: 'EXPENSE', id: row.id }])).get(row.id) ?? 0);
    if (row.cancelledAt) return toExpenseView(row, settled);
    const role = systemLedgers(await db.ledger.findMany({ where: { systemRole: { not: null } }, select: { name: true, systemRole: true } }));
    const creditTo = row.account
      ? { ledger: row.account.tallyLedgerName ?? row.account.name, group: BANK_CASH_GROUPS[row.account.kind] }
      : { ledger: row.vendor!.displayName, group: row.vendor!.isCustomer ? 'Sundry Debtors' : 'Sundry Creditors' };
    const lines = expensePostings(
      { cgst: toNumber(row.cgst), sgst: toNumber(row.sgst), igst: toNumber(row.igst), itcEligible: row.itcEligible, total: toNumber(row.total), cost: toNumber(row.cost) },
      { ledger: row.head.name, group: HEAD_GROUPS[row.head.nature] },
      creditTo,
      role,
    );
    return toExpenseView(row, settled, { type: expenseVoucherType(Boolean(row.accountId)), lines });
  }
}
