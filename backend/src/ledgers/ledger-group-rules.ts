// How groups fit together, as in Tally: a primary group carries a nature
// (and, for income and expenses, whether it affects gross profit); a
// sub-group takes both from its primary group. The CHECK constraints in
// migration 20261103140000_chart_of_accounts hold the per-row rules.
import type { GroupNature } from '../generated/prisma/enums.js';

export interface GroupNode {
  id: string;
  name: string;
  parentId: string | null;
  nature: GroupNature | null;
  affectsGrossProfit: boolean;
  isPredefined: boolean;
}

/** What a group inherits from its primary group. */
export interface GroupPlace {
  primary: GroupNode;
  nature: GroupNature;
  affectsGrossProfit: boolean;
  /** Names from the primary group down to this one. */
  path: string[];
}

/** Natures shown in the Balance Sheet; the rest are in Profit & Loss. */
export const isBalanceSheet = (nature: GroupNature) => nature === 'ASSET' || nature === 'LIABILITY';

/** Normal side of a balance: assets and expenses are debit, liabilities and incomes credit. */
export const isDebitNature = (nature: GroupNature) => nature === 'ASSET' || nature === 'EXPENSE';

/** Walks up to the primary group. The tree is small (28 + a few), so a map is enough. */
export function placeOf(groups: Map<string, GroupNode>, id: string): GroupPlace {
  const path: string[] = [];
  let node = groups.get(id);
  for (let depth = 0; node && depth < 50; depth += 1) {
    path.unshift(node.name);
    if (node.parentId === null) {
      return { primary: node, nature: node.nature!, affectsGrossProfit: node.affectsGrossProfit, path };
    }
    node = groups.get(node.parentId);
  }
  throw new Error(`Group ${id} has no primary group`);
}

/** Whether `id` is the group called `name` or sits somewhere under it. */
export const isWithin = (groups: Map<string, GroupNode>, id: string, name: string) => placeOf(groups, id).path.includes(name);

/** The fields a group save looks at. */
export interface GroupFacts {
  id?: string;
  parentId: string | null;
  nature: GroupNature | null;
  affectsGrossProfit: boolean;
}

/**
 * Null when the group fits the tree: a primary group names its nature, a
 * sub-group does not (it takes its parent's), only income and expense
 * groups affect gross profit, and a group never sits under itself.
 */
export function groupProblem(group: GroupFacts, groups: Map<string, GroupNode>): string | null {
  if (group.parentId === null) {
    if (group.nature === null) return 'A primary group needs its nature: assets, liabilities, income or expenses';
    if (group.affectsGrossProfit && (group.nature === 'ASSET' || group.nature === 'LIABILITY')) {
      return 'Only an income or expense group can affect gross profit';
    }
    return null;
  }
  if (!groups.has(group.parentId)) return 'Pick the group it goes under';
  if (group.nature !== null || group.affectsGrossProfit) {
    return 'A sub-group takes its nature and gross-profit setting from the group above it';
  }
  if (group.id && placeOf(groups, group.parentId).path.includes(groups.get(group.id)?.name ?? '')) {
    return 'A group cannot go under itself or one of its own sub-groups';
  }
  return null;
}

/** Tally's own 28 groups keep their name, place and nature; only the display options change. */
export function predefinedChangeProblem(stored: GroupFacts & { name: string }, next: GroupFacts & { name: string }): string | null {
  const moved =
    next.name !== stored.name ||
    next.parentId !== stored.parentId ||
    next.nature !== stored.nature ||
    next.affectsGrossProfit !== stored.affectsGrossProfit;
  return moved ? `"${stored.name}" is one of Tally's own groups: its name, place and nature stay as they are` : null;
}
