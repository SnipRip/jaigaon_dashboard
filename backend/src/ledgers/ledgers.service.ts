import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { archivedFilter } from '../common/dto/archivable.js';
import { definedFields } from '../common/dto/defined-fields.js';
import { assertLedgerNameFree } from '../common/tally/ledger-names.js';
import { PrismaService } from '../database/prisma.service.js';
import type { CreateLedgerDto } from './dto/create-ledger.dto.js';
import type { UpdateLedgerDto } from './dto/update-ledger.dto.js';
import { ledgerProblem, systemChangeProblem, type LedgerFacts } from './ledger-rules.js';
import { groupMap, toLedgerView, type LedgerView } from './ledger-views.js';

@Injectable()
export class LedgersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(includeArchived?: boolean): Promise<LedgerView[]> {
    const [ledgers, groups] = await Promise.all([
      this.prisma.ledger.findMany({ where: archivedFilter(includeArchived), orderBy: { name: 'asc' } }),
      this.prisma.ledgerGroup.findMany(),
    ]);
    const tree = groupMap(groups);
    return ledgers.map((ledger) => toLedgerView(ledger, tree));
  }

  create(dto: CreateLedgerDto): Promise<LedgerView> {
    return this.prisma.$transaction(async (tx) => {
      const tree = groupMap(await tx.ledgerGroup.findMany());
      const facts: LedgerFacts = { name: dto.name, groupId: dto.groupId, taxKind: dto.taxKind ?? null, systemRole: null, isArchived: false };
      const problem = ledgerProblem(facts, tree);
      if (problem) throw new BadRequestException(problem);
      await assertLedgerNameFree(tx, dto.name);
      const ledger = await tx.ledger.create({
        data: {
          name: dto.name,
          groupId: dto.groupId,
          openingBalance: dto.openingBalance ?? 0,
          openingSide: dto.openingSide ?? 'DR',
          taxKind: facts.taxKind,
          notes: dto.notes ?? null,
        },
      });
      return toLedgerView(ledger, tree);
    });
  }

  update(id: string, dto: UpdateLedgerDto): Promise<LedgerView> {
    return this.prisma.$transaction(async (tx) => {
      const tree = groupMap(await tx.ledgerGroup.findMany());
      const stored = await tx.ledger.findUniqueOrThrow({ where: { id } });
      const changes = definedFields(dto);
      const next: LedgerFacts = {
        name: changes.name ?? stored.name,
        groupId: changes.groupId ?? stored.groupId,
        taxKind: 'taxKind' in changes ? (changes.taxKind ?? null) : stored.taxKind,
        systemRole: stored.systemRole,
        isArchived: changes.isArchived ?? stored.isArchived,
      };
      const problem = systemChangeProblem(stored, next) ?? ledgerProblem(next, tree);
      if (problem) throw new BadRequestException(problem);
      if (next.name !== stored.name) await assertLedgerNameFree(tx, next.name, { owner: 'ledger', id });
      if (next.isArchived && !stored.isArchived && (await tx.loan.count({ where: { OR: [{ assetLedgerId: id }, { tdsLedgerId: id }], isArchived: false } }))) {
        throw new ConflictException(`A live loan posts to "${stored.name}"; it cannot be archived`);
      }
      const ledger = await tx.ledger.update({
        where: { id },
        data: {
          name: next.name,
          groupId: next.groupId,
          taxKind: next.taxKind,
          openingBalance: changes.openingBalance,
          openingSide: changes.openingSide,
          notes: changes.notes,
          isArchived: next.isArchived,
        },
      });
      return toLedgerView(ledger, tree);
    });
  }

  // A ledger a loan points at fails on its foreign key (409, archive it). Once
  // vouchers are stored, a ledger with vouchers is refused the same way.
  async remove(id: string): Promise<void> {
    const ledger = await this.prisma.ledger.findUniqueOrThrow({ where: { id } });
    if (ledger.systemRole) throw new ConflictException(`The app posts to "${ledger.name}"; it cannot be deleted`);
    await this.prisma.ledger.delete({ where: { id } });
  }
}
