import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { archivedFilter } from '../common/dto/archivable.js';
import { definedFields } from '../common/dto/defined-fields.js';
import { toNumber } from '../common/decimal.js';
import { canAccess } from '../common/guards/access.guard.js';
import type { AuthContext } from '../common/types/authenticated-request.js';
import type { ModuleAction } from '../common/types/module-permissions.js';
import { assertLedgerNameFree } from '../common/tally/ledger-names.js';
import { PrismaService } from '../database/prisma.service.js';
import type { Party } from '../generated/prisma/client.js';
import type { CreatePartyDto } from './dto/create-party.dto.js';
import type { ListPartiesQueryDto } from './dto/list-parties-query.dto.js';
import type { UpdatePartyDto } from './dto/update-party.dto.js';
import {
  partyModules,
  partyProblem,
  settleParty,
  type PartyFacts,
} from './party-rules.js';
import { toPartyView, type PartyView } from './party-view.js';

// A party sits in Customers, Vendors or both, so a change needs the
// permission of every list it is in (before and after the change).
function assertMay(auth: AuthContext, modules: string[], action: ModuleAction) {
  if (!modules.every((module) => canAccess(auth, module, action))) {
    throw new ForbiddenException('Your role does not allow this');
  }
}

const check = (facts: PartyFacts) => {
  const problem = partyProblem(facts);
  if (problem) throw new BadRequestException(problem);
};

/** The stored party as rule facts, so an update can be merged onto it. */
const factsOf = (party: Party): PartyFacts => ({
  isCustomer: party.isCustomer,
  isVendor: party.isVendor,
  treatment: party.treatment,
  gstin: party.gstin,
  pan: party.pan,
  placeOfSupply: party.placeOfSupply,
  country: party.country,
  foreignTaxId: party.foreignTaxId,
  currency: party.currency,
  exportRoute: party.exportRoute,
  isGta: party.isGta,
  creditLimit: toNumber(party.creditLimit),
  priceLevelId: party.priceLevelId,
  openingBalanceSide: party.openingBalanceSide,
});

@Injectable()
export class PartiesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListPartiesQueryDto): Promise<PartyView[]> {
    const parties = await this.prisma.party.findMany({
      where: {
        ...archivedFilter(query.includeArchived),
        isCustomer: query.role === 'customer' ? true : undefined,
        isVendor: query.role === 'vendor' ? true : undefined,
      },
      orderBy: { displayName: 'asc' },
    });
    return parties.map(toPartyView);
  }

  async get(id: string): Promise<PartyView> {
    return toPartyView(
      await this.prisma.party.findUniqueOrThrow({ where: { id } }),
    );
  }

  async create(auth: AuthContext, dto: CreatePartyDto): Promise<PartyView> {
    assertMay(auth, partyModules(dto), 'create');
    // The DTO's fields, with the optional ones the rules read defaulted.
    const party = settleParty(
      Object.assign({}, dto, {
        gstin: dto.gstin ?? null,
        pan: dto.pan ?? null,
        placeOfSupply: dto.placeOfSupply ?? null,
        country: dto.country ?? null,
        foreignTaxId: dto.foreignTaxId ?? null,
        currency: dto.currency ?? 'INR',
        exportRoute: dto.exportRoute ?? null,
        isGta: dto.isGta ?? false,
        creditLimit: dto.creditLimit ?? null,
        priceLevelId: dto.priceLevelId ?? null,
        openingBalanceSide: dto.openingBalanceSide ?? 'RECEIVABLE',
      }),
    );
    check(party);
    await this.assertLevel(party.priceLevelId);
    // The display name is the party's Tally ledger.
    await assertLedgerNameFree(this.prisma, party.displayName);
    return toPartyView(await this.prisma.party.create({ data: party }));
  }

  async update(
    auth: AuthContext,
    id: string,
    dto: UpdatePartyDto,
  ): Promise<PartyView> {
    const current = await this.prisma.party.findUniqueOrThrow({
      where: { id },
    });
    // Fields left out keep their stored value; null clears an optional one.
    const merged = {
      ...factsOf(current),
      ...definedFields(dto),
    } as PartyFacts & UpdatePartyDto;
    assertMay(
      auth,
      [...new Set([...partyModules(current), ...partyModules(merged)])],
      'edit',
    );

    // A new GSTIN brings its own PAN and state unless they were sent too.
    if (dto.gstin !== undefined && dto.gstin !== current.gstin) {
      if (dto.pan === undefined) merged.pan = null;
      if (dto.placeOfSupply === undefined) merged.placeOfSupply = null;
    }
    const party = settleParty(merged);
    check(party);
    if (party.priceLevelId !== current.priceLevelId) {
      await this.assertLevel(party.priceLevelId);
    }
    if (party.displayName && party.displayName !== current.displayName) {
      await assertLedgerNameFree(this.prisma, party.displayName, { owner: 'party', id });
    }
    return toPartyView(
      await this.prisma.party.update({ where: { id }, data: party }),
    );
  }

  // A customer is put on a live level; one already on a level archived
  // since keeps it until changed.
  private async assertLevel(id: string | null): Promise<void> {
    if (!id) return;
    const level = await this.prisma.priceLevel.findUnique({
      where: { id },
      select: { isArchived: true },
    });
    if (!level)
      throw new BadRequestException('That price level does not exist');
    if (level.isArchived)
      throw new BadRequestException('That price level is archived');
  }

  // A party with special rates (and, later, documents) is archived instead:
  // the database refuses the delete (409).
  async remove(auth: AuthContext, id: string): Promise<void> {
    const party = await this.prisma.party.findUniqueOrThrow({ where: { id } });
    assertMay(auth, partyModules(party), 'delete');
    await this.prisma.party.delete({ where: { id } });
  }
}
