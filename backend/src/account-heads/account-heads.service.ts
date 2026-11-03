import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { archivedFilter } from '../common/dto/archivable.js';
import { definedFields } from '../common/dto/defined-fields.js';
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

const sameName = (name: string) => ({ equals: name, mode: 'insensitive' as const });

// Tally ledger names are unique across every group and ignore case, so a
// head may not take the name of another head, a bank or cash account or a
// loan. Same-case reuse among heads also fails on the unique index (409).
async function assertNameFree(tx: Prisma.TransactionClient, name: string, id?: string) {
  const [head, account, loan] = await Promise.all([
    tx.accountHead.findFirst({ where: { name: sameName(name), ...(id && { id: { not: id } }) } }),
    tx.bankCashAccount.findFirst({
      where: { OR: [{ tallyLedgerName: sameName(name) }, { tallyLedgerName: null, name: sameName(name) }] },
    }),
    tx.loan.findFirst({ where: { name: sameName(name) } }),
  ]);
  const owner = head ? 'another head' : account ? 'a bank or cash account' : loan ? 'a loan' : null;
  if (owner) throw new ConflictException(`The Tally ledger "${name}" is already ${owner}`);
}

// Loan entries post to the default interest and bank-charges ledgers and to
// any interest ledger a loan names. Those heads keep their name, side
// (expense or income) and stay live until loans pick their ledgers from
// this master.
async function postedByLoans(tx: Prisma.TransactionClient, name: string) {
  if (LOAN_LEDGERS.includes(name)) return true;
  return (await tx.loan.count({ where: { interestLedgerName: name } })) > 0;
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
      await assertNameFree(tx, data.name);
      return toAccountHeadView(await tx.accountHead.create({ data }));
    });
  }

  update(id: string, dto: UpdateAccountHeadDto): Promise<AccountHeadView> {
    return this.prisma.$transaction(async (tx) => {
      const stored = toAccountHeadView(await tx.accountHead.findUniqueOrThrow({ where: { id } }));
      // Fields left out keep their stored value (definedFields).
      const data = toRow(settleHead<AccountHeadView>(stored, definedFields(dto)));
      if (data.name !== stored.name) await assertNameFree(tx, data.name, id);
      const keepsPlace =
        data.name === stored.name && isExpense(data.nature) === isExpense(stored.nature) && !data.isArchived;
      if (!keepsPlace && (await postedByLoans(tx, stored.name))) {
        throw new ConflictException(
          `Loan entries post to "${stored.name}": it keeps its name, stays an ${isExpense(stored.nature) ? 'expense' : 'income'} head and cannot be archived`,
        );
      }
      return toAccountHeadView(await tx.accountHead.update({ where: { id }, data }));
    });
  }

  // Nothing points at a head by id yet. Once expenses and bills do, the
  // delete fails with 409 and the head is archived instead.
  remove(id: string): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      const head = await tx.accountHead.findUniqueOrThrow({ where: { id } });
      if (await postedByLoans(tx, head.name)) {
        throw new ConflictException(`Loan entries post to "${head.name}"; it cannot be deleted`);
      }
      await tx.accountHead.delete({ where: { id } });
    });
  }
}
