import { BadRequestException, Injectable } from '@nestjs/common';
import { archivedFilter } from '../common/dto/archivable.js';
import { ITEM_HSN_PATTERN } from '../common/dto/field-validators.js';
import { toNumber } from '../common/decimal.js';
import { PrismaService } from '../database/prisma.service.js';
import type { Godown, ItemCategory, ItemGroup, Prisma } from '../generated/prisma/client.js';
import { loadPlacement } from '../items/item-placement.js';
import {
  checkAttributes,
  checkPrices,
  checkVariantValues,
  inherited,
  openingValue,
  readAttributes,
  variantKey,
  variantName,
  type GroupAttribute,
} from '../items/item-rules.js';
import type { CreateItemGroupDto, GroupAttributeDto, VariantDto } from './dto/create-item-group.dto.js';
import type { UpdateItemGroupDto } from './dto/update-item-group.dto.js';
import { toItemGroupView, withItemCount, type ItemGroupView } from './item-group-view.js';

const fail = (message: string | null) => {
  if (message) throw new BadRequestException(message);
};

// Inferred (not GroupAttribute[]) so Prisma accepts it as JSON.
const cleanAttributes = (attributes: GroupAttributeDto[]) =>
  attributes.map((attribute) => ({
    name: attribute.name,
    options: attribute.options.map((option) => option.trim()),
  }));

/** Where new variants go and what they inherit. */
interface VariantContext {
  group: ItemGroup;
  attributes: GroupAttribute[];
  category: ItemCategory;
  subCategory: ItemCategory | null;
  godown: Godown | null;
}

@Injectable()
export class ItemGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(includeArchived?: boolean): Promise<ItemGroupView[]> {
    const groups = await this.prisma.itemGroup.findMany({
      where: archivedFilter(includeArchived),
      orderBy: { name: 'asc' },
      include: withItemCount,
    });
    return groups.map(toItemGroupView);
  }

  create(dto: CreateItemGroupDto): Promise<ItemGroupView> {
    const { variants, attributes: rawAttributes, ...fields } = dto;
    const attributes = cleanAttributes(rawAttributes);
    fail(checkAttributes(attributes));

    const seen = new Set<string>();
    for (const variant of variants) {
      fail(checkVariantValues(attributes, variant.attributeValues));
      const key = variantKey(attributes, variant.attributeValues);
      if (seen.has(key)) fail('Two variants have the same values');
      seen.add(key);
    }

    return this.prisma.$transaction(async (tx) => {
      const { category, subCategory } = await loadPlacement(tx, dto);
      const unitId = inherited(dto.defaultUnitId, subCategory?.defaultUnitId, category.defaultUnitId);
      if (variants.length > 0 && !unitId) fail('Pick a unit: none is set on the category');
      const godown = await defaultGodownFor(tx, variants);

      const group = await tx.itemGroup.create({ data: { ...fields, attributes } });
      const context = { group, attributes, category, subCategory, godown };
      for (const variant of variants) await createVariant(tx, context, variant);
      return toItemGroupView(
        await tx.itemGroup.findUniqueOrThrow({ where: { id: group.id }, include: withItemCount }),
      );
    });
  }

  // Saves the group's details and, in the same transaction, its variant
  // rows: a row with an id updates that item, one without creates it.
  update(id: string, dto: UpdateItemGroupDto): Promise<ItemGroupView> {
    const { variants = [], attributes: rawAttributes, ...fields } = dto;
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.itemGroup.findUniqueOrThrow({ where: { id }, include: { items: true } });
      const cleaned = rawAttributes && cleanAttributes(rawAttributes);
      const attributes = cleaned ?? readAttributes(current.attributes);
      if (cleaned) {
        fail(checkAttributes(attributes));
        for (const item of current.items) {
          if (item.isArchived) continue;
          const problem = checkVariantValues(attributes, item.attributeValues as Record<string, unknown>);
          if (problem) fail(`${item.name}: ${problem}. Archive that variant first, or keep its option.`);
        }
      }

      const group = await tx.itemGroup.update({
        where: { id },
        data: { ...fields, attributes: cleaned },
      });
      const { category, subCategory } = await loadPlacement(tx, current);
      const fresh = variants.filter((variant) => !variant.id);
      const unitId = inherited(group.defaultUnitId, subCategory?.defaultUnitId, category.defaultUnitId);
      if (fresh.length > 0 && !unitId) fail('Pick a unit: none is set on the category');

      const taken = new Map(
        current.items.map((item) => [
          variantKey(attributes, item.attributeValues as Record<string, unknown>),
          item.name,
        ]),
      );
      for (const variant of fresh) {
        fail(checkVariantValues(attributes, variant.attributeValues));
        const key = variantKey(attributes, variant.attributeValues);
        const twin = taken.get(key);
        if (twin) fail(`${twin} already has these values`);
        taken.set(key, variant.sku);
      }

      for (const variant of variants) {
        if (!variant.id) continue;
        const item = current.items.find((candidate) => candidate.id === variant.id);
        if (!item) fail('That variant is not in this group');
        fail(
          checkPrices({
            mrp: toNumber(item!.mrp),
            minSellingPrice: toNumber(item!.minSellingPrice),
            sellingPrice: variant.sellingPrice,
          }),
        );
        if (variant.hsn && !ITEM_HSN_PATTERN.test(variant.hsn)) fail(`HSN for ${variant.sku} is 4, 6 or 8 digits`);
        await tx.item.update({
          where: { id: item!.id },
          data: {
            sku: variant.sku,
            name: variant.name ?? undefined,
            hsn: variant.hsn ?? undefined,
            costPrice: variant.costPrice,
            sellingPrice: variant.sellingPrice,
            reorderLevel: variant.reorderLevel ?? undefined,
          },
        });
      }

      const godown = await defaultGodownFor(tx, fresh);
      const context = { group, attributes, category, subCategory, godown };
      for (const variant of fresh) await createVariant(tx, context, variant);
      return toItemGroupView(
        await tx.itemGroup.findUniqueOrThrow({ where: { id }, include: withItemCount }),
      );
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.itemGroup.delete({ where: { id } });
  }
}

/** The default godown when any variant brings opening stock; it must exist then. */
async function defaultGodownFor(tx: Prisma.TransactionClient, variants: VariantDto[]) {
  if (!variants.some((variant) => (variant.openingStock ?? 0) > 0)) return null;
  const godown = await tx.godown.findFirst({ where: { isDefault: true, isArchived: false } });
  if (!godown) fail('Set a default godown before entering opening stock');
  return godown;
}

// A new variant is an item in the group's category, with the group's brand.
// Its unit and GST rate stay null so it inherits them from the group.
async function createVariant(tx: Prisma.TransactionClient, context: VariantContext, variant: VariantDto) {
  const { group, attributes, category, subCategory, godown } = context;
  const hsn = inherited(variant.hsn, group.hsn, subCategory?.hsn, category.hsn);
  if (!hsn) fail(`Enter the HSN for ${variant.sku}`);
  if (!ITEM_HSN_PATTERN.test(hsn!)) fail(`HSN for ${variant.sku} is 4, 6 or 8 digits; set it on the group`);
  const quantity = variant.openingStock ?? 0;
  await tx.item.create({
    data: {
      name: variant.name ?? variantName(group.name, attributes, variant.attributeValues),
      sku: variant.sku,
      categoryId: group.categoryId,
      subCategoryId: group.subCategoryId,
      groupId: group.id,
      attributeValues: variant.attributeValues,
      brandId: group.brandId,
      hsn: hsn!,
      costPrice: variant.costPrice,
      sellingPrice: variant.sellingPrice,
      reorderLevel: variant.reorderLevel ?? 0,
      openingStock:
        quantity > 0 && godown
          ? { create: { godownId: godown.id, quantity, value: openingValue(quantity, variant.costPrice) } }
          : undefined,
    },
  });
}
