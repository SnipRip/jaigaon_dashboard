import { BadRequestException, Injectable } from '@nestjs/common';
import { archivedFilter } from '../common/dto/archivable.js';
import { ITEM_HSN_PATTERN } from '../common/dto/field-validators.js';
import { PrismaService } from '../database/prisma.service.js';
import type { Godown, ItemCategory, ItemGroup, Prisma } from '../generated/prisma/client.js';
import { loadPlacement } from '../items/item-placement.js';
import {
  checkAttributes,
  checkVariantValues,
  inherited,
  openingValue,
  readAttributes,
  variantKey,
  variantName,
  type GroupAttribute,
} from '../items/item-rules.js';
import type { AdoptItemDto, CreateItemGroupDto, GroupAttributeDto, VariantDto } from './dto/create-item-group.dto.js';
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
    const { variants, adopt = [], attributes: rawAttributes, ...fields } = dto;
    const attributes = cleanAttributes(rawAttributes);
    fail(checkAttributes(attributes));

    const taken = new Map<string, string>();
    for (const variant of variants) {
      fail(checkVariantValues(attributes, variant.attributeValues));
      const key = variantKey(attributes, variant.attributeValues);
      if (taken.has(key)) fail('Two variants have the same values');
      taken.set(key, variantLabel(fields.name, attributes, variant));
    }

    return this.prisma.$transaction(async (tx) => {
      const { category, subCategory } = await loadPlacement(tx, dto);
      const unitId = inherited(dto.defaultUnitId, subCategory?.defaultUnitId, category.defaultUnitId);
      if (variants.length > 0 && !unitId) fail('Pick a unit: none is set on the category');
      const godown = await defaultGodownFor(tx, variants);

      const group = await tx.itemGroup.create({ data: { ...fields, attributes } });
      await adoptItems(tx, group, attributes, adopt, taken);
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
    const { variants = [], adopt = [], attributes: rawAttributes, ...fields } = dto;
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
        taken.set(key, variantLabel(group.name, attributes, variant));
      }

      await adoptItems(tx, group, attributes, adopt, taken);

      for (const variant of variants) {
        if (!variant.id) continue;
        const item = current.items.find((candidate) => candidate.id === variant.id);
        if (!item) fail('That variant is not in this group');
        if (variant.hsn && !ITEM_HSN_PATTERN.test(variant.hsn)) fail(`HSN for ${item!.name} is 4, 6 or 8 digits`);
        await tx.item.update({
          where: { id: item!.id },
          data: {
            sku: variant.sku,
            name: variant.name ?? undefined,
            hsn: variant.hsn ?? undefined,
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

// Items made one by one before the group join it as variants and keep their
// stock, SKU and documents; placement follows the group. `taken` holds the
// option combinations already used (key → name) and gains the adopted ones.
async function adoptItems(
  tx: Prisma.TransactionClient,
  group: ItemGroup,
  attributes: GroupAttribute[],
  adopt: AdoptItemDto[],
  taken: Map<string, string>,
) {
  if (adopt.length === 0) return;
  const ids = adopt.map((row) => row.itemId);
  if (new Set(ids).size !== ids.length) fail('An item is listed twice');
  const items = await tx.item.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      groupId: true,
      isArchived: true,
      unitId: true,
      subCategory: { select: { defaultUnitId: true } },
      category: { select: { defaultUnitId: true } },
    },
  });
  if (items.length !== ids.length) fail('An item to add does not exist');
  const itemOf = new Map(items.map((item) => [item.id, item]));
  for (const row of adopt) {
    const item = itemOf.get(row.itemId)!;
    if (item.groupId === group.id) fail(`${item.name} is already in this group`);
    if (item.groupId) fail(`${item.name} is a variant of another group`);
    if (item.isArchived) fail(`${item.name} is archived`);
    const problem = checkVariantValues(attributes, row.attributeValues);
    if (problem) fail(`${item.name}: ${problem}`);
    const key = variantKey(attributes, row.attributeValues);
    const twin = taken.get(key);
    if (twin) fail(`${item.name} has the same values as ${twin}`);
    taken.set(key, item.name);
  }
  for (const row of adopt) {
    const item = itemOf.get(row.itemId)!;
    await tx.item.update({
      where: { id: row.itemId },
      data: {
        // Its stock is counted in its present unit: keep it even if the group's differs.
        unitId: inherited(item.unitId, item.subCategory?.defaultUnitId, item.category.defaultUnitId),
        groupId: group.id,
        attributeValues: row.attributeValues,
        categoryId: group.categoryId,
        subCategoryId: group.subCategoryId,
        ...(group.brandId ? { brandId: group.brandId } : {}),
      },
    });
  }
}

/** How a variant is named in messages: its SKU, else its name. */
const variantLabel = (groupName: string, attributes: GroupAttribute[], variant: VariantDto) =>
  variant.sku ?? variant.name ?? variantName(groupName, attributes, variant.attributeValues);

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
  const label = variantLabel(group.name, attributes, variant);
  const hsn = inherited(variant.hsn, group.hsn, subCategory?.hsn, category.hsn);
  if (!hsn) fail(`Enter the HSN for ${label}`);
  if (!ITEM_HSN_PATTERN.test(hsn!)) fail(`HSN for ${label} is 4, 6 or 8 digits; set it on the group`);
  const quantity = variant.openingStock ?? 0;
  if (quantity > 0 && variant.openingRate == null) fail(`Enter the opening rate for ${label}`);
  await tx.item.create({
    data: {
      name: variant.name ?? variantName(group.name, attributes, variant.attributeValues),
      sku: variant.sku ?? null,
      categoryId: group.categoryId,
      subCategoryId: group.subCategoryId,
      groupId: group.id,
      attributeValues: variant.attributeValues,
      brandId: group.brandId,
      hsn: hsn!,
      reorderLevel: variant.reorderLevel ?? 0,
      openingStock:
        quantity > 0 && godown
          ? { create: { godownId: godown.id, quantity, value: openingValue(quantity, variant.openingRate!) } }
          : undefined,
    },
  });
}
