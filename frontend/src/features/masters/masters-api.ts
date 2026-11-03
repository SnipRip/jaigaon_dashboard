// Calls for the units, brands, godowns and bank & cash masters, and the conversion
// between the backend's shapes and the ones RecordMaster edits.
import { apiRequest } from "@/lib/api-client";
import type { BankCashAccountView } from "@/types/bank-cash";
import type { BrandView, GodownView, UnitView } from "@/types/item-master";
import type { MasterRecord, RecordPersistence } from "./record-master";
import type { Brand, Godown, MoneyAccount, MoneyAccountKind, Unit, UnitKind } from "./types";

export const UNITS_PATH = "/units";
export const BRANDS_PATH = "/brands";
export const GODOWNS_PATH = "/godowns";
export const BANK_CASH_PATH = "/bank-cash-accounts";

/** The list RecordMaster shows: archived records too, behind its Archived filter. */
export const withArchived = (path: string) => `${path}?includeArchived=true`;

export const toUnit = (unit: UnitView): Unit => ({
  id: unit.id,
  symbol: unit.symbol,
  name: unit.name,
  kind: unit.kind.toLowerCase() as UnitKind,
  decimals: unit.decimals,
  uqc: unit.uqc,
  archived: unit.isArchived,
  itemCount: unit.itemCount,
});

export const toBrand = (brand: BrandView): Brand => ({
  id: brand.id,
  name: brand.name,
  categoryId: brand.categoryId ?? undefined,
  authorised: brand.isAuthorised,
  notes: brand.notes ?? undefined,
  archived: brand.isArchived,
  itemCount: brand.itemCount,
});

export const toGodown = (godown: GodownView): Godown => ({
  id: godown.id,
  name: godown.name,
  address: godown.address,
  kind: godown.kind.toLowerCase() as Godown["kind"],
  isDefault: godown.isDefault,
  inCharge: godown.inCharge ?? undefined,
  phone: godown.phone ?? undefined,
  archived: godown.isArchived,
});

export const toMoneyAccount = (account: BankCashAccountView): MoneyAccount => ({
  id: account.id,
  name: account.name,
  kind: account.kind.toLowerCase() as MoneyAccountKind,
  bankName: account.bankName ?? undefined,
  branch: account.branch ?? undefined,
  accountNumber: account.accountNumber ?? undefined,
  ifsc: account.ifsc ?? undefined,
  upiId: account.upiId ?? undefined,
  openingBalance: account.openingBalance,
  openingDate: account.openingDate,
  showOnInvoice: account.showOnInvoice,
  tallyLedgerName: account.tallyLedgerName ?? undefined,
  tallyGroup: account.tallyGroup,
  archived: account.isArchived,
});

// Form values (blanks left out) → request bodies. A blank optional field is
// sent as null so an edit can clear it.
export type Changes = Record<string, unknown>;

const unitBody = (changes: Changes) => ({
  symbol: changes.symbol,
  name: changes.name,
  kind: String(changes.kind).toUpperCase(),
  decimals: changes.decimals,
  uqc: changes.uqc,
});

const brandBody = (changes: Changes) => ({
  name: changes.name,
  categoryId: changes.categoryId ?? null,
  isAuthorised: Boolean(changes.authorised),
  notes: changes.notes ?? null,
});

const godownBody = (changes: Changes) => ({
  name: changes.name,
  address: changes.address,
  kind: String(changes.kind).toUpperCase(),
  isDefault: Boolean(changes.isDefault),
  inCharge: changes.inCharge ?? null,
  phone: changes.phone ?? null,
});

// A cash account's bank fields are hidden on the form, so they arrive blank
// and go as null: the backend refuses bank details on cash.
const bankCashBody = (changes: Changes) => ({
  name: changes.name,
  kind: String(changes.kind).toUpperCase(),
  bankName: changes.bankName ?? null,
  branch: changes.branch ?? null,
  accountNumber: changes.accountNumber ?? null,
  ifsc: changes.ifsc ?? null,
  upiId: changes.upiId ?? null,
  openingBalance: changes.openingBalance ?? 0,
  openingDate: changes.openingDate,
  showOnInvoice: Boolean(changes.showOnInvoice),
  tallyLedgerName: changes.tallyLedgerName ?? null,
});

/**
 * Create, update, archive and delete through one route. `onSaved` runs after
 * each change, to reload the list (making one godown the default changes
 * the others).
 */
export function persistence<V, R extends MasterRecord>(
  path: string,
  toRecord: (view: V) => R,
  toBody: (changes: Changes) => object,
  onSaved: () => void,
): RecordPersistence<R> {
  const saved = (record: R) => (onSaved(), record);
  return {
    create: async (changes) => saved(toRecord(await apiRequest<V>(path, { method: "POST", body: toBody(changes) }))),
    update: async (record, changes) =>
      saved(toRecord(await apiRequest<V>(`${path}/${record.id}`, { method: "PATCH", body: toBody(changes) }))),
    archive: async (record) =>
      saved(toRecord(await apiRequest<V>(`${path}/${record.id}`, { method: "PATCH", body: { isArchived: !record.archived } }))),
    remove: async (record) => {
      await apiRequest(`${path}/${record.id}`, { method: "DELETE" });
      onSaved();
    },
  };
}

export const unitPersistence = (onSaved: () => void) => persistence(UNITS_PATH, toUnit, unitBody, onSaved);
export const brandPersistence = (onSaved: () => void) => persistence(BRANDS_PATH, toBrand, brandBody, onSaved);
export const godownPersistence = (onSaved: () => void) => persistence(GODOWNS_PATH, toGodown, godownBody, onSaved);
export const bankCashPersistence = (onSaved: () => void) => persistence(BANK_CASH_PATH, toMoneyAccount, bankCashBody, onSaved);
