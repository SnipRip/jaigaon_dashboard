// Groups and general ledgers: calls, and the conversion between the
// backend's shapes and the records RecordMaster edits.
import { persistence, type Changes } from "@/features/masters/masters-api";
import type { MasterRecord, RecordPersistence } from "@/features/masters/record-master";
import { apiRequest } from "@/lib/api-client";
import type { DrCr, GroupNature, LedgerGroupView, LedgerView, TaxKind } from "@/types/ledger";

export const LEDGER_GROUPS_PATH = "/ledger-groups";
export const LEDGERS_PATH = "/ledgers";

/** Stands for "no parent" in the group picker; it goes to the backend as null. */
export const PRIMARY = "PRIMARY";
/** Stands for "no tax kind"; it goes as null. */
export const NO_TAX = "NONE";

export const NATURES: { value: GroupNature; label: string }[] = [
  { value: "ASSET", label: "Assets (Balance Sheet)" },
  { value: "LIABILITY", label: "Liabilities (Balance Sheet)" },
  { value: "INCOME", label: "Income (Profit & Loss)" },
  { value: "EXPENSE", label: "Expenses (Profit & Loss)" },
];

export const natureLabel = (nature: GroupNature | null) => NATURES.find((option) => option.value === nature)?.label ?? "Primary";

export const TAX_KINDS: { value: TaxKind | typeof NO_TAX; label: string }[] = [
  { value: NO_TAX, label: "Not a tax ledger" },
  { value: "CGST", label: "CGST" },
  { value: "SGST", label: "SGST / UTGST" },
  { value: "IGST", label: "IGST" },
  { value: "CESS", label: "Cess" },
  { value: "TDS", label: "TDS" },
  { value: "TCS", label: "TCS" },
  { value: "OTHER", label: "Other duty" },
];

export interface GroupRecord extends MasterRecord {
  view: LedgerGroupView;
  name: string;
  parentId: string;
  nature?: GroupNature;
  affectsGrossProfit: boolean;
  behavesAsSubLedger: boolean;
  nettBalances: boolean;
  position: number;
  notes?: string;
}

export const toGroupRecord = (group: LedgerGroupView): GroupRecord => ({
  id: group.id,
  view: group,
  name: group.name,
  parentId: group.parentId ?? PRIMARY,
  nature: group.parentId ? undefined : group.nature,
  affectsGrossProfit: group.parentId ? false : group.affectsGrossProfit,
  behavesAsSubLedger: group.behavesAsSubLedger,
  nettBalances: group.nettBalances,
  position: group.position,
  notes: group.notes ?? undefined,
});

// A sub-group's nature fields are hidden on the form and go as null / false.
const groupBody = (changes: Changes) => {
  const primary = changes.parentId === PRIMARY || !changes.parentId;
  return {
    name: changes.name,
    parentId: primary ? null : changes.parentId,
    nature: primary ? (changes.nature ?? null) : null,
    affectsGrossProfit: primary ? Boolean(changes.affectsGrossProfit) : false,
    behavesAsSubLedger: Boolean(changes.behavesAsSubLedger),
    nettBalances: Boolean(changes.nettBalances),
    position: changes.position ?? 0,
    notes: changes.notes ?? null,
  };
};

/** Groups are never archived: an unused one is deleted, as in Tally. */
export function groupPersistence(onSaved: () => void): RecordPersistence<GroupRecord> {
  const saved = (view: LedgerGroupView) => (onSaved(), toGroupRecord(view));
  return {
    create: async (changes) => saved(await apiRequest<LedgerGroupView>(LEDGER_GROUPS_PATH, { method: "POST", body: groupBody(changes) })),
    update: async (record, changes) =>
      saved(
        await apiRequest<LedgerGroupView>(`${LEDGER_GROUPS_PATH}/${record.id}`, {
          method: "PATCH",
          // Tally's own groups refuse a new name, place or nature (the backend says so).
          body: groupBody(changes),
        }),
      ),
    remove: async (record) => {
      await apiRequest(`${LEDGER_GROUPS_PATH}/${record.id}`, { method: "DELETE" });
      onSaved();
    },
  };
}

export interface LedgerRecord extends MasterRecord {
  view: LedgerView;
  name: string;
  groupId?: string;
  openingBalance: number;
  openingSide: DrCr;
  taxKind: TaxKind | typeof NO_TAX;
  notes?: string;
}

export const toLedgerRecord = (ledger: LedgerView): LedgerRecord => ({
  id: ledger.id,
  archived: ledger.isArchived,
  view: ledger,
  name: ledger.name,
  groupId: ledger.groupId ?? undefined,
  openingBalance: ledger.openingBalance,
  openingSide: ledger.openingSide,
  taxKind: ledger.taxKind ?? NO_TAX,
  notes: ledger.notes ?? undefined,
});

const ledgerBody = (changes: Changes) => ({
  name: changes.name,
  groupId: changes.groupId,
  openingBalance: changes.openingBalance ?? 0,
  openingSide: changes.openingSide ?? "DR",
  taxKind: changes.taxKind && changes.taxKind !== NO_TAX ? changes.taxKind : null,
  notes: changes.notes ?? null,
});

export const ledgerPersistence = (onSaved: () => void) => persistence(LEDGERS_PATH, toLedgerRecord, ledgerBody, onSaved);
