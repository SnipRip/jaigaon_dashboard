import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { archivedFilter } from '../common/dto/archivable.js';
import { definedFields } from '../common/dto/defined-fields.js';
import { assertLedgerNameFree } from '../common/tally/ledger-names.js';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { toAccountHeadView, type AccountHeadView } from './account-head-view.js';
import { headProblem, isExpense, LOAN_LEDGERS, settleHead } from './account-head-rules.js';
import type { CreateAccountHeadDto } from './dto/create-account-head.dto.js';
import type { UpdateAccountHeadDto } from './dto/update-account-head.dto.js';

type HeadFields = Omit<AccountHeadView, 'id' | 'tallyGroup'>;

function toRow(head: HeadFields) {
  const problem = headProblem(head);
  if (problem) throw new BadRequestException(problem);
  return {
    name: head.name,
    nature: head.nature,
    gst: head.gst,
    gstRatePct: head.gstRatePct,
    allocation: head.allocation,
    notes: head.notes,
    isArchived: head.isArchived,
  };
}

// Loan entries post to the default interest and bank-charges ledgers by
// name, and to the head a loan picks as its interest ledger. Those heads keep
// their name, side (expense or income) and stay live: a loan we take needs
// an expense head, one we give an income head (loans/loan-rules.ts).
async function postedByLoans(tx: Prisma.TransactionClient, head: { id: string; name: string }) {
  if (LOAN_LEDGERS.includes(head.name)) return true;
  return (await tx.loan.count({ where: { interestHeadId: head.id } })) > 0;
}

// Locks the head so a loan saving at the same moment either sees the change
// or is seen by postedByLoans (LoansService locks it FOR SHARE).
async function lockHead(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT 1 FROM "AccountHead" WHERE "id" = ${id}::uuid FOR UPDATE`;
  return tx.accountHead.findUniqueOrThrow({ where: { id } });
}

@Injectable()
export class AccountHeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(includeArchived?: boolean): Promise<AccountHeadView[]> {
    const heads = await this.prisma.accountHead.findMany({
      where: archivedFilter(includeArchived),
      orderBy: [{ nature: 'asc' }, { name: 'asc' }],
    });
    return heads.map(toAccountHeadView);
  }

  create(dto: CreateAccountHeadDto): Promise<AccountHeadView> {
    const data = toRow({
      name: dto.name,
      nature: dto.nature,
      gst: dto.gst ?? null,
      gstRatePct: dto.gstRatePct ?? null,
      allocation: dto.allocation ?? null,
      notes: dto.notes ?? null,
      isArchived: false,
    });
    return this.prisma.$transaction(async (tx) => {
      await assertLedgerNameFree(tx, data.name);
      return toAccountHeadView(await tx.accountHead.create({ data }));
    });
  }

  update(id: string, dto: UpdateAccountHeadDto): Promise<AccountHeadView> {
    return this.prisma.$transaction(async (tx) => {
      const stored = toAccountHeadView(await lockHead(tx, id));
      // Fields left out keep their stored value (definedFields).
      const data = toRow(settleHead<AccountHeadView>(stored, definedFields(dto)));
      if (data.name !== stored.name) await assertLedgerNameFree(tx, data.name, { owner: 'head', id });
      const keepsPlace =
        data.name === stored.name && isExpense(data.nature) === isExpense(stored.nature) && !data.isArchived;
      if (!keepsPlace && (await postedByLoans(tx, stored))) {
        throw new ConflictException(
          `Loan entries post to "${stored.name}": it keeps its name, stays an ${isExpense(stored.nature) ? 'expense' : 'income'} head and cannot be archived`,
        );
      }
      // Expenses and bill charges book to the head by id: it stays an expense head.
      if (isExpense(stored.nature) && !isExpense(data.nature)) {
        const [expenses, charges] = await Promise.all([tx.expense.count({ where: { headId: id } }), tx.purchaseBillCharge.count({ where: { headId: id } })]);
        if (expenses + charges > 0) throw new ConflictException(`Expenses or bills are booked under "${stored.name}": it stays an expense head`);
      }
      return toAccountHeadView(await tx.accountHead.update({ where: { id }, data }));
    });
  }

  // Loans point at their interest head (the foreign key refuses the delete
  // too). Once expenses and bills store their head, the delete fails with
  // 409 and the head is archived instead.
  remove(id: string): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      const head = await lockHead(tx, id);
      if (await postedByLoans(tx, head)) {
        throw new ConflictException(`Loan entries post to "${head.name}"; it cannot be deleted`);
      }
      await tx.accountHead.delete({ where: { id } });
    });
  }
}
