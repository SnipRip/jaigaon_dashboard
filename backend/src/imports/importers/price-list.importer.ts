// The day-wise price list. A row is one item's price from a date till a date
// (blank till: that day only), matched by SKU and the two dates, so the same
// sheet uploaded twice updates rather than duplicates. A row gives the price
// or a margin % to work it out from the cost; given both, the price wins.
// "Download sheet for a date" (`template`) lists every live item with the
// price in force that day, dated that day and with no record ID: staff
// change the prices and upload it back.
import type { PrismaService } from '../../database/prisma.service.js';
import { itemCostSource } from '../../items/item-costs.js';
import { CreateItemPriceDto } from '../../price-list/dto/create-item-price.dto.js';
import { UpdateItemPriceDto } from '../../price-list/dto/update-item-price.dto.js';
import {
  effectivePrices,
  marginOf,
} from '../../price-list/price-list-rules.js';
import {
  toItemMasterPrices,
  toItemPriceView,
  type ItemPriceView,
} from '../../price-list/price-list-views.js';
import type { PriceListService } from '../../price-list/price-list.service.js';
import type { ImportColumn } from '../import-cells.js';
import { dateCell } from '../import-workbook.js';
import {
  pick,
  textOf,
  validDto,
  type MasterImporter,
} from '../master-importer.js';

/** A sheet row: a stored entry, or a template row (empty id) for a date. */
type PriceRow = Omit<ItemPriceView, 'updatedBy' | 'createdAt' | 'updatedAt' | 'sellingPrice'> & {
  /** Null on a template row for an item with no price that day. */
  sellingPrice: number | null;
  itemName: string;
  /** The item's last landed cost (null before any stock), shown so the margin can be judged. */
  masterCost: number | null;
  marginPct: number | null;
};

/** Columns the save takes; the rest (item name, master cost) are for reading. */
const SAVED_FIELDS = [
  'itemId',
  'validFrom',
  'validTill',
  'sellingPrice',
  'marginPct',
  'mrp',
  'minSellingPrice',
  'costPrice',
  'notes',
];

export function priceListImporter(
  prices: PriceListService,
  prisma: PrismaService,
): MasterImporter<PriceRow> {
  const columns: ImportColumn<PriceRow>[] = [
    {
      header: 'Item SKU',
      field: 'itemId',
      kind: 'ref',
      ref: 'item',
      required: true,
      value: (row, refs) => refs.nameOf('item', row.itemId),
    },
    {
      header: 'Item name',
      field: 'itemName',
      kind: 'text',
      hint: 'For reading only; the SKU picks the item.',
      value: (row) => row.itemName,
    },
    {
      header: 'Valid from',
      field: 'validFrom',
      kind: 'date',
      required: true,
      value: (row) => dateCell(row.validFrom),
    },
    {
      header: 'Valid till',
      field: 'validTill',
      kind: 'date',
      hint: 'Blank: that day only. After it the item master price applies again.',
      value: (row) => dateCell(row.validTill),
    },
    {
      header: 'Price',
      field: 'sellingPrice',
      kind: 'number',
      hint: 'Rupees per base unit. Leave blank to work it out from Margin %.',
      value: (row) => row.sellingPrice,
    },
    {
      header: 'Margin %',
      field: 'marginPct',
      kind: 'number',
      hint: 'On the price, from the cost. Used only when Price is blank.',
      value: (row) => row.marginPct,
    },
    {
      header: 'Cost',
      field: 'costPrice',
      kind: 'number',
      hint: "The day's cost. Blank: the last landed cost.",
      value: (row) => row.costPrice,
    },
    {
      header: 'Last landed cost',
      field: 'masterCost',
      kind: 'number',
      hint: 'For reading only; worked out from the stock.',
      value: (row) => row.masterCost,
    },
    {
      header: 'MRP',
      field: 'mrp',
      kind: 'number',
      hint: "Blank: the item's MRP.",
      value: (row) => row.mrp,
    },
    {
      header: 'Minimum price',
      field: 'minSellingPrice',
      kind: 'number',
      hint: 'Blank: no minimum for these days.',
      value: (row) => row.minSellingPrice,
    },
    {
      header: 'Notes',
      field: 'notes',
      kind: 'text',
      value: (row) => row.notes,
    },
  ];
  return {
    key: 'price-list',
    title: 'price list',
    module: '/price-list',
    columns,
    refs: ['item'],
    archivable: true,
    list: async () => {
      const entries = await prisma.itemPrice.findMany({
        orderBy: [{ validFrom: 'desc' }, { item: { name: 'asc' } }],
        include: {
          item: {
            select: {
              name: true,
              mrp: true,
              ...itemCostSource,
            },
          },
        },
      });
      return entries.map((entry) => {
        const view = toItemPriceView(entry);
        const master = toItemMasterPrices(entry.item);
        const day = effectivePrices(view, master);
        return {
          ...view,
          itemName: entry.item.name,
          masterCost: master.costPrice,
          marginPct: marginOf(day.sellingPrice, day.costPrice),
        };
      });
    },
    template: async (date) =>
      (await prices.template(date)).map((row) => {
        const day = row.entry && effectivePrices(row.entry, row.item);
        return {
          id: '',
          itemId: row.itemId,
          itemName: row.name,
          validFrom: date,
          validTill: date,
          sellingPrice: day?.sellingPrice ?? null,
          marginPct: day ? marginOf(day.sellingPrice, day.costPrice) : null,
          costPrice: row.entry?.costPrice ?? null,
          masterCost: row.item.costPrice,
          mrp: row.entry?.mrp ?? null,
          minSellingPrice: row.entry?.minSellingPrice ?? null,
          notes: null,
          isArchived: false,
        };
      }),
    findExisting: (values) =>
      values.itemId && values.validFrom
        ? prices.findByKey(
            textOf(values.itemId),
            textOf(values.validFrom),
            values.validTill ? textOf(values.validTill) : null,
          )
        : Promise.resolve(null),
    create: async (values, { auth }) =>
      (
        await prices.create(
          await validDto(CreateItemPriceDto, pick(values, SAVED_FIELDS)),
          auth.userId,
        )
      ).id,
    update: async (id, values, { auth }) => {
      const fields = SAVED_FIELDS.filter((field) => field !== 'itemId').concat(
        'isArchived',
      );
      void (await prices.update(
        id,
        await validDto(UpdateItemPriceDto, pick(values, fields)),
        auth.userId,
      ));
    },
  };
}
