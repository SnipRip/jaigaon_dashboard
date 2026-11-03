// Price levels, customer special rates and quantity slabs. A rate or slab
// targets an item (by SKU) or a category, never both. Category discounts on
// a price level are kept as stored (edited on the Rates screen).
import { isoDate } from '../../common/dates.js';
import { toNumber } from '../../common/decimal.js';
import type { PrismaService } from '../../database/prisma.service.js';
import type { PriceLevel, QuantitySlab, SpecialRate } from '../../generated/prisma/client.js';
import { CreatePriceLevelDto } from '../../pricing/dto/create-price-level.dto.js';
import { CreateQuantitySlabDto } from '../../pricing/dto/create-quantity-slab.dto.js';
import { CreateSpecialRateDto } from '../../pricing/dto/create-special-rate.dto.js';
import { UpdatePriceLevelDto } from '../../pricing/dto/update-price-level.dto.js';
import { UpdateQuantitySlabDto } from '../../pricing/dto/update-quantity-slab.dto.js';
import { UpdateSpecialRateDto } from '../../pricing/dto/update-special-rate.dto.js';
import type { PriceLevelsService } from '../../pricing/price-levels.service.js';
import type { QuantitySlabsService } from '../../pricing/quantity-slabs.service.js';
import type { SpecialRatesService } from '../../pricing/special-rates.service.js';
import type { ImportColumn } from '../import-cells.js';
import { dateCell } from '../import-workbook.js';
import { pick, sameText, textOf, validDto, type MasterImporter } from '../master-importer.js';

const fieldsOf = <V>(columns: ImportColumn<V>[]) => columns.map((column) => column.field);

export function priceLevelsImporter(levels: PriceLevelsService, prisma: PrismaService): MasterImporter<PriceLevel> {
  const columns: ImportColumn<PriceLevel>[] = [
    { header: 'Name', field: 'name', kind: 'text', required: true, value: (level) => level.name },
    { header: 'Discount %', field: 'discountPct', kind: 'number', required: true, hint: 'Off the selling price, for every category without its own discount.', value: (level) => toNumber(level.discountPct) },
    { header: 'Description', field: 'description', kind: 'text', value: (level) => level.description },
  ];
  return {
    key: 'price-levels',
    title: 'price levels',
    module: '/rates',
    columns,
    refs: [],
    archivable: true,
    list: () => prisma.priceLevel.findMany({ orderBy: { name: 'asc' } }),
    findExisting: async (values) =>
      values.name ? ((await prisma.priceLevel.findFirst({ where: { name: sameText(values.name) } }))?.id ?? null) : null,
    create: async (values) => (await levels.create(await validDto(CreatePriceLevelDto, pick(values, fieldsOf(columns))))).id,
    update: async (id, values) => void (await levels.update(id, await validDto(UpdatePriceLevelDto, values))),
  };
}

// Target columns shared by special rates and slabs: an item by SKU, or a category.
const targetColumns = <V extends { itemId: string | null; categoryId: string | null }>(): ImportColumn<V>[] => [
  { header: 'Item SKU', field: 'itemId', kind: 'ref', ref: 'item', hint: 'An item, or leave blank and give a category.', value: (row, refs) => refs.nameOf('item', row.itemId) },
  { header: 'Category', field: 'categoryId', kind: 'ref', ref: 'category', hint: 'Sub-category as Parent > Sub-category.', value: (row, refs) => refs.nameOf('category', row.categoryId) },
];

/** The same item or category: an id, or null when the column is blank or absent. */
const target = (values: Record<string, unknown>) => ({
  itemId: (values.itemId as string | undefined) ?? null,
  categoryId: (values.categoryId as string | undefined) ?? null,
});

const RATE_KINDS = { NET: 'Net rate (₹)', DISCOUNT: 'Discount %' };

export function specialRatesImporter(rates: SpecialRatesService, prisma: PrismaService): MasterImporter<SpecialRate> {
  const columns: ImportColumn<SpecialRate>[] = [
    { header: 'Customer', field: 'partyId', kind: 'ref', ref: 'customer', required: true, hint: 'Display name, or GSTIN when two share a name.', value: (rate, refs) => refs.nameOf('customer', rate.partyId) },
    ...targetColumns<SpecialRate>(),
    { header: 'Rate kind', field: 'kind', kind: 'choice', choices: RATE_KINDS, required: true, value: (rate) => RATE_KINDS[rate.kind] },
    { header: 'Value', field: 'value', kind: 'number', required: true, hint: 'Rupees per base unit, or the discount %.', value: (rate) => toNumber(rate.value) },
    { header: 'Valid from', field: 'validFrom', kind: 'date', required: true, value: (rate) => dateCell(isoDate(rate.validFrom)) },
    { header: 'Valid till', field: 'validTill', kind: 'date', value: (rate) => dateCell(rate.validTill ? isoDate(rate.validTill) : null) },
    { header: 'Notes', field: 'notes', kind: 'text', value: (rate) => rate.notes },
  ];
  return {
    key: 'special-rates',
    title: 'special rates',
    module: '/rates',
    columns,
    refs: ['customer', 'item', 'category'],
    archivable: true,
    list: () => prisma.specialRate.findMany({ orderBy: [{ partyId: 'asc' }, { validFrom: 'asc' }] }),
    // One customer, target and start date is one rate.
    findExisting: async (values) => {
      if (!values.partyId || !values.validFrom) return null;
      const found = await prisma.specialRate.findFirst({
        where: { partyId: textOf(values.partyId), ...target(values), validFrom: new Date(`${textOf(values.validFrom)}T00:00:00Z`) },
      });
      return found?.id ?? null;
    },
    create: async (values) => (await rates.create(await validDto(CreateSpecialRateDto, pick(values, fieldsOf(columns))))).id,
    update: async (id, values) => void (await rates.update(id, await validDto(UpdateSpecialRateDto, values))),
  };
}

export function quantitySlabsImporter(slabs: QuantitySlabsService, prisma: PrismaService): MasterImporter<QuantitySlab> {
  const columns: ImportColumn<QuantitySlab>[] = [
    ...targetColumns<QuantitySlab>(),
    { header: 'From quantity', field: 'minQuantity', kind: 'number', required: true, hint: 'In the base unit.', value: (slab) => toNumber(slab.minQuantity) },
    { header: 'Discount %', field: 'discountPct', kind: 'number', required: true, value: (slab) => toNumber(slab.discountPct) },
  ];
  return {
    key: 'quantity-slabs',
    title: 'quantity slabs',
    module: '/rates',
    columns,
    refs: ['item', 'category'],
    archivable: true,
    list: () => prisma.quantitySlab.findMany({ orderBy: [{ itemId: 'asc' }, { categoryId: 'asc' }, { minQuantity: 'asc' }] }),
    // One target and starting quantity is one slab.
    findExisting: async (values) => {
      if (values.minQuantity === undefined) return null;
      const found = await prisma.quantitySlab.findFirst({ where: { ...target(values), minQuantity: Number(values.minQuantity) } });
      return found?.id ?? null;
    },
    create: async (values) => (await slabs.create(await validDto(CreateQuantitySlabDto, pick(values, fieldsOf(columns))))).id,
    update: async (id, values) => void (await slabs.update(id, await validDto(UpdateQuantitySlabDto, values))),
  };
}
