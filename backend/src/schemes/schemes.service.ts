import { BadRequestException, Injectable } from '@nestjs/common';
import { dateOnly, todayInIndia } from '../common/dates.js';
import { archivedFilter } from '../common/dto/archivable.js';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { CreateSchemeDto } from './dto/create-scheme.dto.js';
import type { EvaluateSchemesDto } from './dto/evaluate-schemes.dto.js';
import type { UpdateSchemeDto } from './dto/update-scheme.dto.js';
import {
  applySchemes,
  schemeProblem,
  type SchemeDraft,
  type SchemeLine,
  type SchemeParty,
  type SchemeRateSource,
  type SchemeResult,
} from './scheme-rules.js';
import { schemeInclude, toSchemeView, type SchemeView } from './scheme-views.js';

type Db = Prisma.TransactionClient | PrismaService;

type Draft = SchemeDraft & Pick<SchemeView, 'name' | 'description' | 'stackable' | 'notes' | 'isArchived'>;

/** A document line as quotations and invoices hand it over. */
export interface DocumentSchemeLine {
  key: string;
  itemId: string;
  quantity: number;
  rate: number;
  discountPct: number;
  rateSource: SchemeRateSource;
}

const fail = (problem: string | null) => {
  if (problem) throw new BadRequestException(problem);
};

@Injectable()
export class SchemesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(includeArchived?: boolean): Promise<SchemeView[]> {
    const rows = await this.prisma.scheme.findMany({
      where: archivedFilter(includeArchived),
      include: schemeInclude,
      orderBy: [{ isArchived: 'asc' }, { validFrom: 'desc' }, { name: 'asc' }],
    });
    return rows.map(toSchemeView);
  }

  create(dto: CreateSchemeDto): Promise<SchemeView> {
    const draft: Draft = {
      name: dto.name,
      description: dto.description ?? null,
      level: dto.level,
      benefit: dto.benefit,
      value: dto.value,
      buyQuantity: dto.buyQuantity ?? null,
      maxDiscount: dto.maxDiscount ?? null,
      minQuantity: dto.minQuantity ?? null,
      minValue: dto.minValue ?? null,
      partyScope: dto.partyScope,
      partyIds: dto.partyIds ?? [],
      targets: (dto.targets ?? []).map(toTarget),
      rateSources: dto.rateSources,
      stackable: dto.stackable ?? false,
      validFrom: dto.validFrom,
      validTill: dto.validTill ?? null,
      notes: dto.notes ?? null,
      isArchived: false,
    };
    return this.prisma.$transaction(async (tx) => {
      await this.check(tx, draft);
      const row = await tx.scheme.create({
        data: { ...this.row(draft), ...this.links(draft) },
        include: schemeInclude,
      });
      return toSchemeView(row);
    });
  }

  update(id: string, dto: UpdateSchemeDto): Promise<SchemeView> {
    return this.prisma.$transaction(async (tx) => {
      const current = toSchemeView(await tx.scheme.findUniqueOrThrow({ where: { id }, include: schemeInclude }));
      // Fields left out keep their stored value; null clears an optional one.
      const changes = Object.fromEntries(Object.entries(dto).filter(([, value]) => value !== undefined)) as Partial<Draft>;
      const draft: Draft = { ...current, ...changes, targets: dto.targets ? dto.targets.map(toTarget) : current.targets };
      if (!draft.isArchived) await this.check(tx, draft);
      // Targets and customers are replaced as a whole when sent.
      if (dto.targets) await tx.schemeTarget.deleteMany({ where: { schemeId: id } });
      if (dto.partyIds) await tx.schemeParty.deleteMany({ where: { schemeId: id } });
      const links = this.links(draft);
      const row = await tx.scheme.update({
        where: { id },
        data: {
          ...this.row(draft),
          ...(dto.targets ? { targets: links.targets } : {}),
          ...(dto.partyIds ? { parties: links.parties } : {}),
        },
        include: schemeInclude,
      });
      return toSchemeView(row);
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.scheme.delete({ where: { id } });
  }

  /** What the schemes in force take off a document's lines (the API's preview). */
  evaluate(dto: EvaluateSchemesDto): Promise<SchemeResult> {
    return this.forDocument(
      this.prisma,
      dto.partyId ?? null,
      dto.date ?? todayInIndia(),
      dto.lines.map((line) => ({
        key: line.key,
        itemId: line.itemId,
        quantity: line.quantity,
        rate: line.rate,
        discountPct: line.discountPct ?? 0,
        rateSource: line.rateSource,
      })),
    );
  }

  /**
   * The same for a document being saved, inside its transaction, so the
   * stored lines carry exactly what the schemes gave on its date.
   */
  async forDocument(db: Db, partyId: string | null, date: string, lines: DocumentSchemeLine[]): Promise<SchemeResult> {
    const day = dateOnly(date);
    const itemIds = [...new Set(lines.map((line) => line.itemId))];
    const [items, party, schemes] = await Promise.all([
      db.item.findMany({ where: { id: { in: itemIds } }, select: { id: true, categoryId: true, subCategoryId: true, brandId: true } }),
      partyId ? db.party.findUnique({ where: { id: partyId }, select: { id: true, treatment: true } }) : Promise.resolve(null),
      db.scheme.findMany({
        where: { isArchived: false, validFrom: { lte: day }, OR: [{ validTill: null }, { validTill: { gte: day } }] },
        include: schemeInclude,
      }),
    ]);
    if (partyId && !party) throw new BadRequestException('That customer does not exist');
    const itemOf = new Map(items.map((item) => [item.id, item]));
    const schemeLines: SchemeLine[] = lines.map((line) => {
      const item = itemOf.get(line.itemId);
      if (!item) throw new BadRequestException('An item on the document does not exist');
      return { ...line, item };
    });
    const buyer: SchemeParty | null = party && { id: party.id, overseas: party.treatment === 'OVERSEAS' || party.treatment === 'SEZ' };
    return applySchemes(schemes.map(toSchemeView), schemeLines, buyer, date);
  }

  private async check(tx: Prisma.TransactionClient, draft: Draft) {
    fail(schemeProblem(draft));
    const ids = (key: 'itemId' | 'categoryId' | 'brandId') =>
      [...new Set(draft.targets.map((target) => target[key]).filter((id): id is string => id !== null))];
    const [itemIds, categoryIds, brandIds] = [ids('itemId'), ids('categoryId'), ids('brandId')];
    const [items, categories, brands, customers] = await Promise.all([
      tx.item.count({ where: { id: { in: itemIds } } }),
      tx.itemCategory.count({ where: { id: { in: categoryIds } } }),
      tx.brand.count({ where: { id: { in: brandIds } } }),
      tx.party.count({ where: { id: { in: draft.partyIds }, isCustomer: true, isArchived: false } }),
    ]);
    if (items !== itemIds.length) fail('An item on the scheme does not exist');
    if (categories !== categoryIds.length) fail('A category on the scheme does not exist');
    if (brands !== brandIds.length) fail('A brand on the scheme does not exist');
    if (customers !== draft.partyIds.length) fail('A customer on the scheme does not exist or is archived');
  }

  private row(draft: Draft) {
    return {
      name: draft.name,
      description: draft.description,
      level: draft.level,
      benefit: draft.benefit,
      value: draft.value,
      buyQuantity: draft.buyQuantity,
      maxDiscount: draft.maxDiscount,
      minQuantity: draft.minQuantity,
      minValue: draft.minValue,
      partyScope: draft.partyScope,
      rateSources: draft.rateSources,
      stackable: draft.stackable,
      validFrom: dateOnly(draft.validFrom),
      validTill: draft.validTill ? dateOnly(draft.validTill) : null,
      notes: draft.notes,
      isArchived: draft.isArchived,
    };
  }

  private links(draft: Draft) {
    return {
      targets: { create: draft.targets },
      parties: { create: draft.partyIds.map((partyId) => ({ partyId })) },
    };
  }
}

const toTarget = (target: { itemId?: string | null; categoryId?: string | null; brandId?: string | null }) => ({
  itemId: target.itemId ?? null,
  categoryId: target.categoryId ?? null,
  brandId: target.brandId ?? null,
});
