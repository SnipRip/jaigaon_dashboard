// HSN / SAC codes and items. Items are matched by SKU; a sheet sets the
// fields of an item, not its group, variant options, alternate units or
// opening stock (those stay as stored).
import { toNumber } from '../../common/decimal.js';
import type { PrismaService } from '../../database/prisma.service.js';
import type { Item } from '../../generated/prisma/client.js';
import { CreateHsnCodeDto } from '../../hsn-codes/dto/create-hsn-code.dto.js';
import { HsnRateDto } from '../../hsn-codes/dto/hsn-rate.dto.js';
import { UpdateHsnCodeDto } from '../../hsn-codes/dto/update-hsn-code.dto.js';
import type { HsnCodeView } from '../../hsn-codes/hsn-code-view.js';
import type { HsnCodesService } from '../../hsn-codes/hsn-codes.service.js';
import { CreateItemDto } from '../../items/dto/create-item.dto.js';
import { UpdateItemDto } from '../../items/dto/update-item.dto.js';
import type { ItemsService } from '../../items/items.service.js';
import { RowProblem, type ImportColumn } from '../import-cells.js';
import { dateCell } from '../import-workbook.js';
import { pick, sameText, textOf, validDto, type ImportContext, type MasterImporter } from '../master-importer.js';
import { CATEGORY_SEPARATOR } from '../ref-book.js';

const CODE_KINDS = { HSN: 'HSN (goods)', SAC: 'SAC (services)' };
const latest = (code: HsnCodeView) => code.rates[code.rates.length - 1];

export function hsnImporter(codes: HsnCodesService, prisma: PrismaService): MasterImporter<HsnCodeView> {
  const columns: ImportColumn<HsnCodeView>[] = [
    { header: 'Code', field: 'code', kind: 'text', required: true, hint: 'HSN 4, 6 or 8 digits; SAC 6 digits. Fixed once created.', value: (code) => code.code },
    { header: 'Kind', field: 'kind', kind: 'choice', choices: CODE_KINDS, required: true, value: (code) => CODE_KINDS[code.kind] },
    { header: 'Description', field: 'description', kind: 'text', required: true, value: (code) => code.description },
    { header: 'GST rate %', field: 'ratePct', kind: 'number', required: true, hint: 'A new rate or date adds to the rate history.', value: (code) => latest(code)?.ratePct ?? null },
    { header: 'Rate applies from', field: 'effectiveFrom', kind: 'date', required: true, value: (code) => dateCell(latest(code)?.effectiveFrom ?? null) },
    { header: 'Cess %', field: 'cessPct', kind: 'number', value: (code) => code.cessPct },
    { header: 'Reverse charge', field: 'reverseCharge', kind: 'yesno', value: (code) => (code.reverseCharge ? 'Yes' : 'No') },
    { header: 'Notes', field: 'notes', kind: 'text', value: (code) => code.notes },
  ];
  return {
    key: 'hsn-codes',
    title: 'HSN and SAC codes',
    module: '/masters/hsn',
    columns,
    refs: [],
    archivable: false,
    list: () => codes.list(),
    findExisting: async (values) =>
      values.code ? ((await prisma.hsnCode.findFirst({ where: { code: textOf(values.code) } }))?.id ?? null) : null,
    create: async (values) =>
      (await codes.create(await validDto(CreateHsnCodeDto, pick(values, columns.map((column) => column.field))))).id,
    update: async (id, values) => {
      const stored = await prisma.hsnCode.findUniqueOrThrow({ where: { id } });
      if ((values.code !== undefined && values.code !== stored.code) || (values.kind !== undefined && values.kind !== stored.kind)) {
        throw new RowProblem('The code and kind of a stored HSN / SAC code cannot change; add a new row instead');
      }
      await codes.update(id, await validDto(UpdateHsnCodeDto, pick(values, ['description', 'cessPct', 'reverseCharge', 'notes'])));
      // Same date replaces that rate, a new date adds one: running the row again changes nothing.
      if (values.ratePct !== undefined && values.effectiveFrom !== undefined) {
        await codes.addRate(id, await validDto(HsnRateDto, pick(values, ['ratePct', 'effectiveFrom'])));
      }
    },
  };
}

const ITEM_FIELDS = [
  'name', 'sku', 'brandId', 'description', 'hsn', 'gstRatePct', 'unitId', 'weightKg',
  'mrp', 'preferredSupplier', 'reorderLevel',
];

/** Category and sub-category names → ids; a sub-category is looked up under its category. */
function placement(values: Record<string, unknown>, { refs }: ImportContext) {
  if (values.category === undefined && values.subCategory === undefined) return {};
  if (typeof values.category !== 'string') throw new RowProblem('Category: enter the top-level category');
  const category = values.category.split(CATEGORY_SEPARATOR)[0].trim();
  return {
    categoryId: refs.idOf('category', category),
    subCategoryId:
      typeof values.subCategory === 'string' ? refs.idOf('category', `${category}${CATEGORY_SEPARATOR}${values.subCategory}`) : null,
  };
}

export function itemsImporter(items: ItemsService, prisma: PrismaService): MasterImporter<Item> {
  const columns: ImportColumn<Item>[] = [
    { header: 'Name', field: 'name', kind: 'text', required: true, value: (item) => item.name },
    { header: 'SKU', field: 'sku', kind: 'text', hint: 'Optional unique item code; matches the row to a stored item. Blank: matched by name among items with no SKU.', value: (item) => item.sku },
    { header: 'Category', field: 'category', kind: 'text', required: true, hint: 'Top-level category, as in the category tree.', value: (item, refs) => refs.nameOf('category', item.categoryId) },
    {
      header: 'Sub-category',
      field: 'subCategory',
      kind: 'text',
      value: (item, refs) => refs.nameOf('category', item.subCategoryId)?.split(CATEGORY_SEPARATOR).pop() ?? null,
    },
    { header: 'Brand', field: 'brandId', kind: 'ref', ref: 'brand', value: (item, refs) => refs.nameOf('brand', item.brandId) },
    { header: 'Description', field: 'description', kind: 'text', value: (item) => item.description },
    { header: 'HSN', field: 'hsn', kind: 'text', required: true, value: (item) => item.hsn },
    { header: 'GST rate %', field: 'gstRatePct', kind: 'number', hint: 'Blank: from the HSN code.', value: (item) => toNumber(item.gstRatePct) },
    { header: 'Unit', field: 'unitId', kind: 'ref', ref: 'unit', hint: 'Unit symbol (kg, pcs, bag). Blank: from the category.', value: (item, refs) => refs.nameOf('unit', item.unitId) },
    { header: 'Weight (kg)', field: 'weightKg', kind: 'number', value: (item) => toNumber(item.weightKg) },
    { header: 'MRP', field: 'mrp', kind: 'number', value: (item) => toNumber(item.mrp) },
    { header: 'Preferred supplier', field: 'preferredSupplier', kind: 'text', value: (item) => item.preferredSupplier },
    { header: 'Reorder level', field: 'reorderLevel', kind: 'number', keepIfBlank: true, value: (item) => toNumber(item.reorderLevel) },
  ];
  return {
    key: 'items',
    title: 'items',
    module: '/items',
    columns,
    refs: ['category', 'brand', 'unit'],
    archivable: true,
    list: () => prisma.item.findMany({ orderBy: { name: 'asc' } }),
    findExisting: async (values) => {
      if (values.sku) return (await prisma.item.findFirst({ where: { sku: sameText(values.sku) } }))?.id ?? null;
      if (typeof values.name !== 'string') return null;
      // No SKU: the one item of that name without a SKU; two such names cannot be told apart.
      const named = await prisma.item.findMany({ where: { sku: null, name: sameText(values.name) }, select: { id: true }, take: 2 });
      if (named.length > 1) throw new RowProblem(`Two items are named ${values.name}: give them SKUs to tell them apart`);
      return named[0]?.id ?? null;
    },
    create: async (values, context) => {
      const dto = await validDto(CreateItemDto, { ...pick(values, ITEM_FIELDS), ...placement(values, context) });
      return (await items.create(dto)).id;
    },
    update: async (id, values, context) => {
      const dto = await validDto(UpdateItemDto, { ...pick(values, [...ITEM_FIELDS, 'isArchived']), ...placement(values, context) });
      await items.update(id, dto);
    },
  };
}
