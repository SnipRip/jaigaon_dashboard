import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { archivedFilter } from '../common/dto/archivable.js';
import { toNumber } from '../common/decimal.js';
import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import type { CreateItemDto } from './dto/create-item.dto.js';
import type { OpeningStockDto } from './dto/item-line.dto.js';
import type { ListItemsQueryDto } from './dto/list-items-query.dto.js';
import type { UpdateItemDto } from './dto/update-item.dto.js';
import { loadPlacement } from './item-placement.js';
import {
  checkAlternateUnits,
  checkOpeningStock,
  checkPrices,
  checkVariantValues,
  inherited,
  openingValue,
  readAttributes,
} from './item-rules.js';
import { itemRowInclude, toItemView, type ItemView } from './item-view.js';

/** The fields the checks need, after an update is merged onto the stored item. */
type ItemFacts = Pick<CreateItemDto, 'categoryId' | 'sellingPrice' | 'costPrice'> & {
  subCategoryId?: string | null;
  groupId?: string | null;
  attributeValues?: Record<string, string> | null;
  unitId?: string | null;
  mrp?: number | null;
  minSellingPrice?: number | null;
};

const fail = (message: string | null) => {
  if (message) throw new BadRequestException(message);
};

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListItemsQueryDto): Promise<ItemView[]> {
    const items = await this.prisma.item.findMany({
      where: {
        ...archivedFilter(query.includeArchived),
        categoryId: query.categoryId,
        groupId: query.groupId,
      },
      orderBy: { name: 'asc' },
      include: itemRowInclude,
    });
    return items.map(toItemView);
  }

  async get(id: string): Promise<ItemView> {
    return toItemView(
      await this.prisma.item.findUniqueOrThrow({ where: { id }, include: itemRowInclude }),
    );
  }

  create(dto: CreateItemDto): Promise<ItemView> {
    const { alternateUnits = [], openingStock = [], ...fields } = dto;
    return this.prisma.$transaction(async (tx) => {
      const baseUnitId = await this.check(tx, dto);
      fail(checkAlternateUnits(baseUnitId, alternateUnits.map((row) => row.unitId)));
      fail(checkOpeningStock(openingStock.map((row) => row.godownId)));

      const item = await tx.item.create({
        data: {
          ...fields,
          attributeValues: jsonOrNull(fields.attributeValues),
          alternateUnits: { create: alternateUnits },
          openingStock: { create: openingRows(openingStock, dto.costPrice) },
        },
        include: itemRowInclude,
      });
      return toItemView(item);
    });
  }

  update(id: string, dto: UpdateItemDto): Promise<ItemView> {
    const { alternateUnits, openingStock, ...fields } = dto;
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.item.findUniqueOrThrow({ where: { id }, include: itemRowInclude });
      const merged: ItemFacts = {
        categoryId: dto.categoryId ?? current.categoryId,
        subCategoryId: dto.subCategoryId === undefined ? current.subCategoryId : dto.subCategoryId,
        groupId: dto.groupId === undefined ? current.groupId : dto.groupId,
        attributeValues:
          dto.attributeValues === undefined
            ? (current.attributeValues as Record<string, string> | null)
            : dto.attributeValues,
        unitId: dto.unitId === undefined ? current.unitId : dto.unitId,
        sellingPrice: dto.sellingPrice ?? toNumber(current.sellingPrice),
        costPrice: dto.costPrice ?? toNumber(current.costPrice),
        mrp: dto.mrp === undefined ? toNumber(current.mrp) : dto.mrp,
        minSellingPrice:
          dto.minSellingPrice === undefined ? toNumber(current.minSellingPrice) : dto.minSellingPrice,
      };
      const baseUnitId = await this.check(tx, merged, id);
      const unitIds = (alternateUnits ?? current.alternateUnits).map((row) => row.unitId);
      fail(checkAlternateUnits(baseUnitId, unitIds));

      if (alternateUnits) {
        await tx.itemUnitConversion.deleteMany({ where: { itemId: id } });
      }
      if (openingStock) {
        fail(checkOpeningStock(openingStock.map((row) => row.godownId)));
        await tx.itemOpeningStock.deleteMany({ where: { itemId: id } });
      }
      const item = await tx.item.update({
        where: { id },
        data: {
          ...fields,
          attributeValues: jsonOrNull(fields.attributeValues),
          alternateUnits: alternateUnits ? { create: alternateUnits } : undefined,
          openingStock: openingStock
            ? { create: openingRows(openingStock, merged.costPrice) }
            : undefined,
        },
        include: itemRowInclude,
      });
      return toItemView(item);
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.item.delete({ where: { id } });
  }

  // Checks placement, group attribute values and prices, and returns the
  // base unit the item ends up with (its own or inherited).
  private async check(tx: Prisma.TransactionClient, facts: ItemFacts, itemId?: string) {
    const { category, subCategory, group } = await loadPlacement(tx, facts);
    fail(checkPrices(facts));

    if (group) {
      const attributes = readAttributes(group.attributes);
      fail(checkVariantValues(attributes, facts.attributeValues));
      const twin = await tx.item.findFirst({
        where: {
          groupId: group.id,
          attributeValues: { equals: facts.attributeValues as Prisma.InputJsonValue },
          id: itemId ? { not: itemId } : undefined,
        },
        select: { name: true },
      });
      if (twin) throw new ConflictException(`${twin.name} already has these values in this group`);
    } else if (facts.attributeValues && Object.keys(facts.attributeValues).length > 0) {
      throw new BadRequestException('Attribute values are only for items in a group');
    }

    const baseUnitId = inherited(
      facts.unitId,
      group?.defaultUnitId,
      subCategory?.defaultUnitId,
      category.defaultUnitId,
    );
    if (!baseUnitId) {
      throw new BadRequestException('Pick a unit: none is set on the category or group');
    }
    return baseUnitId;
  }
}

const openingRows = (rows: OpeningStockDto[], costPrice: number) =>
  rows.map((row) => ({
    godownId: row.godownId,
    quantity: row.quantity,
    value: openingValue(row.quantity, costPrice, row.value),
  }));

// A null clears a JSON column only through Prisma's DbNull marker.
const jsonOrNull = (value: Record<string, string> | null | undefined) =>
  value === null ? Prisma.DbNull : value;
