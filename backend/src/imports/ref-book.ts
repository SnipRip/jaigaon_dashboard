// Names in a sheet ↔ ids in the database, for columns that point at another
// master ("Category", "Brand", "Customer"…). Loaded once per import or
// download, so 5,000 rows do not cost 5,000 lookups.
import type { PrismaService } from '../database/prisma.service.js';
import { RowProblem } from './import-cells.js';

export type RefKind = 'category' | 'brand' | 'unit' | 'customer' | 'item' | 'bankAccount' | 'accountHead' | 'ledger' | 'ledgerGroup';

/** What a column needs to write a name for an id. */
export interface RefNames {
  nameOf(kind: RefKind, id: string | null): string | null;
}

const LABELS: Record<RefKind, string> = {
  category: 'category',
  brand: 'brand',
  unit: 'unit',
  customer: 'customer',
  item: 'item (by SKU)',
  bankAccount: 'bank or cash account',
  accountHead: 'expense or income head',
  ledger: 'general ledger',
  ledgerGroup: 'group',
};

/** A sub-category is written "Cement > OPC", a top-level category by its name. */
export const CATEGORY_SEPARATOR = ' > ';

const key = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

export class RefBook implements RefNames {
  private readonly names = new Map<RefKind, Map<string, string>>();
  /** Name → ids; more than one id means the name is ambiguous. */
  private readonly ids = new Map<RefKind, Map<string, string[]>>();

  constructor(private readonly prisma: PrismaService) {}

  async load(kinds: RefKind[]): Promise<this> {
    await Promise.all(kinds.filter((kind) => !this.names.has(kind)).map((kind) => this.loadKind(kind)));
    return this;
  }

  nameOf(kind: RefKind, id: string | null): string | null {
    return id ? (this.names.get(kind)?.get(id) ?? null) : null;
  }

  /** The id for a name in the sheet; a missing or ambiguous name skips the row. */
  idOf(kind: RefKind, name: string): string {
    const found = this.ids.get(kind)?.get(key(name)) ?? [];
    if (found.length === 1) return found[0];
    if (found.length > 1) {
      throw new RowProblem(`More than one ${LABELS[kind]} is called "${name}"${kind === 'customer' ? '; use their GSTIN' : ''}`);
    }
    throw new RowProblem(`No ${LABELS[kind]} called "${name}"${kind === 'category' ? ` (write a sub-category as Parent${CATEGORY_SEPARATOR}Sub-category)` : ''}`);
  }

  private set(kind: RefKind, rows: { id: string; name: string; aliases?: (string | null)[] }[]) {
    const names = new Map<string, string>();
    const ids = new Map<string, string[]>();
    const add = (name: string, id: string) => {
      const list = ids.get(key(name)) ?? [];
      if (!list.includes(id)) list.push(id);
      ids.set(key(name), list);
    };
    for (const row of rows) {
      names.set(row.id, row.name);
      add(row.name, row.id);
      for (const alias of row.aliases ?? []) if (alias) add(alias, row.id);
    }
    this.names.set(kind, names);
    this.ids.set(kind, ids);
  }

  private async loadKind(kind: RefKind) {
    const db = this.prisma;
    switch (kind) {
      case 'category': {
        const all = await db.itemCategory.findMany({ select: { id: true, name: true, parentId: true } });
        const byId = new Map(all.map((category) => [category.id, category]));
        this.set(
          kind,
          all.map((category) => {
            const parent = category.parentId ? byId.get(category.parentId) : undefined;
            return { id: category.id, name: parent ? `${parent.name}${CATEGORY_SEPARATOR}${category.name}` : category.name };
          }),
        );
        return;
      }
      case 'brand':
        return this.set(kind, await db.brand.findMany({ select: { id: true, name: true } }));
      case 'unit':
        return this.set(
          kind,
          (await db.unit.findMany({ select: { id: true, symbol: true, name: true } })).map((unit) => ({
            id: unit.id,
            name: unit.symbol,
            aliases: [unit.name],
          })),
        );
      case 'customer':
        return this.set(
          kind,
          (
            await db.party.findMany({ where: { isCustomer: true }, select: { id: true, displayName: true, gstin: true } })
          ).map((party) => ({ id: party.id, name: party.displayName, aliases: [party.gstin] })),
        );
      case 'item':
        return this.set(kind, (await db.item.findMany({ select: { id: true, sku: true } })).map((item) => ({ id: item.id, name: item.sku })));
      case 'bankAccount':
        return this.set(kind, await db.bankCashAccount.findMany({ select: { id: true, name: true } }));
      case 'accountHead':
        return this.set(kind, await db.accountHead.findMany({ select: { id: true, name: true } }));
      case 'ledger':
        return this.set(kind, await db.ledger.findMany({ select: { id: true, name: true } }));
      case 'ledgerGroup':
        return this.set(kind, await db.ledgerGroup.findMany({ select: { id: true, name: true } }));
    }
  }
}
