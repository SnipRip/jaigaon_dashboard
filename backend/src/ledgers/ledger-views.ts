import { toNumber } from '../common/decimal.js';
import type { Ledger, LedgerGroup } from '../generated/prisma/client.js';
import type { DrCr, GroupNature, LedgerRole, TaxKind } from '../generated/prisma/enums.js';
import { placeOf, type GroupNode } from './ledger-group-rules.js';

/** A group as the API returns it, with what it inherits from its primary group. */
export interface LedgerGroupView {
  id: string;
  name: string;
  parentId: string | null;
  parentName: string | null;
  /** Its own (primary groups) or its primary group's. */
  nature: GroupNature;
  affectsGrossProfit: boolean;
  primaryName: string;
  isPredefined: boolean;
  behavesAsSubLedger: boolean;
  nettBalances: boolean;
  position: number;
  notes: string | null;
  /** General ledgers and sub-groups directly under it. */
  ledgerCount: number;
  childCount: number;
}

export interface LedgerView {
  id: string;
  name: string;
  /** Null only for Profit & Loss A/c (Primary). */
  groupId: string | null;
  groupName: string | null;
  primaryName: string | null;
  /** Group names from the primary group down to the ledger's group; empty for Primary. */
  path: string[];
  nature: GroupNature | null;
  openingBalance: number;
  openingSide: DrCr;
  systemRole: LedgerRole | null;
  taxKind: TaxKind | null;
  notes: string | null;
  isArchived: boolean;
}

export const groupMap = (groups: LedgerGroup[]): Map<string, GroupNode> => new Map(groups.map((group) => [group.id, group]));

export function toLedgerGroupView(group: LedgerGroup, groups: Map<string, GroupNode>, counts: { ledgers: number; children: number }): LedgerGroupView {
  const place = placeOf(groups, group.id);
  return {
    id: group.id,
    name: group.name,
    parentId: group.parentId,
    parentName: group.parentId ? (groups.get(group.parentId)?.name ?? null) : null,
    nature: place.nature,
    affectsGrossProfit: place.affectsGrossProfit,
    primaryName: place.primary.name,
    isPredefined: group.isPredefined,
    behavesAsSubLedger: group.behavesAsSubLedger,
    nettBalances: group.nettBalances,
    position: group.position,
    notes: group.notes,
    ledgerCount: counts.ledgers,
    childCount: counts.children,
  };
}

export function toLedgerView(ledger: Ledger, groups: Map<string, GroupNode>): LedgerView {
  const place = ledger.groupId ? placeOf(groups, ledger.groupId) : null;
  return {
    id: ledger.id,
    name: ledger.name,
    groupId: ledger.groupId,
    groupName: ledger.groupId ? (groups.get(ledger.groupId)?.name ?? null) : null,
    primaryName: place?.primary.name ?? null,
    path: place?.path ?? [],
    nature: place?.nature ?? null,
    openingBalance: toNumber(ledger.openingBalance),
    openingSide: ledger.openingSide,
    systemRole: ledger.systemRole,
    taxKind: ledger.taxKind,
    notes: ledger.notes,
    isArchived: ledger.isArchived,
  };
}
