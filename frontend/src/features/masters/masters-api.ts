// Calls for the units, brands, godowns, bank & cash, expense & income heads
// and vehicle masters, and the conversion
// between the backend's shapes and the ones RecordMaster edits.
import { apiRequest } from "@/lib/api-client";
import type { AccountHeadView } from "@/types/account-head";
import type { BankCashAccountView } from "@/types/bank-cash";
import type { BrandView, GodownView, UnitView } from "@/types/item-master";
import type { VehicleView } from "@/types/vehicle";
import type { MasterRecord, RecordPersistence } from "./record-master";
import type { AccountHead, Brand, Godown, HeadAllocation, HeadGst, HeadNature, MoneyAccount, MoneyAccountKind, Unit, UnitKind, Vehicle } from "./types";

export const UNITS_PATH = "/units";
export const BRANDS_PATH = "/brands";
export const GODOWNS_PATH = "/godowns";
export const BANK_CASH_PATH = "/bank-cash-accounts";
export const ACCOUNT_HEADS_PATH = "/account-heads";
export const VEHICLES_PATH = "/vehicles";

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

// DIRECT_EXPENSE ↔ "direct-expense": the values the screens already use.
const fromEnum = <T extends string>(value: string) => value.toLowerCase().replace(/_/g, "-") as T;
const toEnum = (value: unknown) => String(value).toUpperCase().replace(/-/g, "_");

export const toAccountHead = (head: AccountHeadView): AccountHead => ({
  id: head.id,
  name: head.name,
  nature: fromEnum<HeadNature>(head.nature),
  gst: head.gst ? fromEnum<HeadGst>(head.gst) : undefined,
  gstRatePct: head.gstRatePct ?? undefined,
  allocation: head.allocation ? fromEnum<HeadAllocation>(head.allocation) : undefined,
  notes: head.notes ?? undefined,
  tallyGroup: head.tallyGroup,
  archived: head.isArchived,
});

// Form values (blanks left out) → request bodies. A blank optional field is
// sent as null so an edit can clear it.
export const toVehicle = (vehicle: VehicleView): Vehicle => ({
  id: vehicle.id,
  number: vehicle.number,
  type: vehicle.type.toLowerCase().replace("_", "-") as Vehicle["type"],
  capacityTons: vehicle.capacityTons ?? undefined,
  ownership: vehicle.ownership === "OWN" ? "own" : "hired",
  transporterId: vehicle.transporterId ?? undefined,
  transporterName: vehicle.transporterName ?? undefined,
  driverName: vehicle.driverName ?? undefined,
  driverPhone: vehicle.driverPhone ?? undefined,
  notes: vehicle.notes ?? undefined,
  shipmentCount: vehicle.shipmentCount,
  archived: vehicle.isArchived,
});

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

// An income head's GST and allocation fields are hidden on the form, so they
// arrive blank and go as null: the backend refuses them on income heads.
const accountHeadBody = (changes: Changes) => ({
  name: changes.name,
  nature: toEnum(changes.nature),
  gst: changes.gst ? toEnum(changes.gst) : null,
  gstRatePct: changes.gstRatePct ? Number(changes.gstRatePct) : null,
  allocation: changes.allocation ? toEnum(changes.allocation) : null,
  notes: changes.notes ?? null,
});

// Our own vehicle's transporter field is hidden, so it arrives blank and goes as null.
const vehicleBody = (changes: Changes) => ({
  number: changes.number,
  type: toEnum(changes.type),
  capacityTons: changes.capacityTons ? Number(changes.capacityTons) : null,
  ownership: toEnum(changes.ownership),
  transporterId: changes.ownership === "hired" ? (changes.transporterId ?? null) : null,
  driverName: changes.driverName ?? null,
  driverPhone: changes.driverPhone ?? null,
  notes: changes.notes ?? null,
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
export const accountHeadPersistence = (onSaved: () => void) => persistence(ACCOUNT_HEADS_PATH, toAccountHead, accountHeadBody, onSaved);
export const vehiclePersistence = (onSaved: () => void) => persistence(VEHICLES_PATH, toVehicle, vehicleBody, onSaved);
