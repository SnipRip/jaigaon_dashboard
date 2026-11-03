import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { definedFields } from '../common/dto/defined-fields.js';
import { assertLedgerNameFree } from '../common/tally/ledger-names.js';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { CreateLedgerGroupDto } from './dto/create-ledger-group.dto.js';
import type { UpdateLedgerGroupDto } from './dto/update-ledger-group.dto.js';
import { groupProblem, predefinedChangeProblem, type GroupFacts } from './ledger-group-rules.js';
import { groupMap, toLedgerGroupView, type LedgerGroupView } from './ledger-views.js';

type Tx = Prisma.TransactionClient;

// Groups change rarely and the whole tree is a few dozen rows, so each save
// reads it and checks the change against it in one transaction. The table
// is locked so two saves cannot build a loop between them.
async function loadTree(tx: Tx) {
  await tx.$executeRaw`LOCK TABLE "LedgerGroup" IN SHARE ROW EXCLUSIVE MODE`;
  return groupMap(await tx.ledgerGroup.findMany());
}

@Injectable()
export class LedgerGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<LedgerGroupView[]> {
    const groups = await this.prisma.ledgerGroup.findMany({
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { ledgers: true, children: true } } },
    });
    const tree = groupMap(groups);
    return groups.map((group) => toLedgerGroupView(group, tree, { ledgers: group._count.ledgers, children: group._count.children }));
  }

  create(dto: CreateLedgerGroupDto): Promise<LedgerGroupView> {
    return this.prisma.$transaction(async (tx) => {
      const tree = await loadTree(tx);
      const parentId = dto.parentId ?? null;
      const facts: GroupFacts = { parentId, nature: parentId ? null : (dto.nature ?? null), affectsGrossProfit: parentId ? false : (dto.affectsGrossProfit ?? false) };
      const problem = groupProblem(facts, tree);
      if (problem) throw new BadRequestException(problem);
      await assertLedgerNameFree(tx, dto.name);
      const group = await tx.ledgerGroup.create({
        data: {
          name: dto.name,
          ...facts,
          behavesAsSubLedger: dto.behavesAsSubLedger ?? false,
          nettBalances: dto.nettBalances ?? false,
          position: dto.position ?? 0,
          notes: dto.notes ?? null,
        },
      });
      tree.set(group.id, group);
      return toLedgerGroupView(group, tree, { ledgers: 0, children: 0 });
    });
  }

  update(id: string, dto: UpdateLedgerGroupDto): Promise<LedgerGroupView> {
    return this.prisma.$transaction(async (tx) => {
      const tree = await loadTree(tx);
      const stored = await tx.ledgerGroup.findUniqueOrThrow({ where: { id } });
      const changes = definedFields(dto);
      const parentId = 'parentId' in changes ? (changes.parentId ?? null) : stored.parentId;
      // Moving under a group drops the primary-only fields; becoming primary needs them.
      const next = {
        id,
        name: changes.name ?? stored.name,
        parentId,
        nature: parentId ? null : (changes.nature ?? stored.nature),
        affectsGrossProfit: parentId ? false : (changes.affectsGrossProfit ?? stored.affectsGrossProfit),
      };
      const problem = stored.isPredefined ? predefinedChangeProblem(stored, next) : groupProblem(next, tree);
      if (problem) throw new BadRequestException(problem);
      if (next.name !== stored.name) await assertLedgerNameFree(tx, next.name, { owner: 'group', id });
      const group = await tx.ledgerGroup.update({
        where: { id },
        data: {
          name: next.name,
          parentId: next.parentId,
          nature: next.nature,
          affectsGrossProfit: next.affectsGrossProfit,
          behavesAsSubLedger: changes.behavesAsSubLedger,
          nettBalances: changes.nettBalances,
          position: changes.position,
          notes: changes.notes,
        },
        include: { _count: { select: { ledgers: true, children: true } } },
      });
      tree.set(id, group);
      return toLedgerGroupView(group, tree, { ledgers: group._count.ledgers, children: group._count.children });
    });
  }

  // As in Tally: Tally's own groups stay, and a group with sub-groups or
  // ledgers is emptied first. Heads, parties, bank accounts and loans are
  // placed by their own master, never under a user group.
  remove(id: string): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.ledgerGroup.findUniqueOrThrow({
        where: { id },
        include: { _count: { select: { ledgers: true, children: true } } },
      });
      if (group.isPredefined) throw new ConflictException(`"${group.name}" is one of Tally's own groups; it cannot be deleted`);
      if (group._count.children > 0 || group._count.ledgers > 0) {
        throw new ConflictException(`"${group.name}" still has sub-groups or ledgers; move or delete them first`);
      }
      await tx.ledgerGroup.delete({ where: { id } });
    });
  }
}
