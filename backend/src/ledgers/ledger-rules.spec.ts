import { describe, expect, it } from 'vitest';
import { groupProblem, isWithin, placeOf, predefinedChangeProblem, type GroupNode } from './ledger-group-rules.js';
import { ledgerProblem, systemChangeProblem, type LedgerFacts } from './ledger-rules.js';

const node = (id: string, parentId: string | null, nature: GroupNode['nature'] = null, affectsGrossProfit = false): GroupNode => ({
  id,
  name: id,
  parentId,
  nature,
  affectsGrossProfit,
  isPredefined: true,
});
const groups = new Map<string, GroupNode>(
  [
    node('Current Liabilities', null, 'LIABILITY'),
    node('Duties & Taxes', 'Current Liabilities'),
    node('Direct Expenses', null, 'EXPENSE', true),
    node('Freight', 'Direct Expenses'),
    node('Fixed Assets', null, 'ASSET'),
    node('Indirect Expenses', null, 'EXPENSE'),
  ].map((group) => [group.id, group]),
);

describe('groups', () => {
  it('takes nature and gross profit from the primary group', () => {
    expect(placeOf(groups, 'Freight')).toMatchObject({ nature: 'EXPENSE', affectsGrossProfit: true, path: ['Direct Expenses', 'Freight'] });
    expect(isWithin(groups, 'Duties & Taxes', 'Current Liabilities')).toBe(true);
  });

  it('needs a nature on a primary group and none on a sub-group', () => {
    expect(groupProblem({ parentId: null, nature: null, affectsGrossProfit: false }, groups)).toMatch(/needs its nature/);
    expect(groupProblem({ parentId: null, nature: 'ASSET', affectsGrossProfit: true }, groups)).toMatch(/income or expense/);
    expect(groupProblem({ parentId: 'Fixed Assets', nature: 'ASSET', affectsGrossProfit: false }, groups)).toMatch(/takes its nature/);
    expect(groupProblem({ parentId: 'Fixed Assets', nature: null, affectsGrossProfit: false }, groups)).toBeNull();
    expect(groupProblem({ parentId: null, nature: 'EXPENSE', affectsGrossProfit: true }, groups)).toBeNull();
  });

  it('never puts a group under itself or its own sub-group', () => {
    expect(groupProblem({ id: 'Direct Expenses', parentId: 'Freight', nature: null, affectsGrossProfit: false }, groups)).toMatch(/under itself/);
  });

  it("keeps Tally's own groups where they are", () => {
    const stored = { name: 'Duties & Taxes', parentId: 'Current Liabilities', nature: null, affectsGrossProfit: false };
    expect(predefinedChangeProblem(stored, { ...stored })).toBeNull();
    expect(predefinedChangeProblem(stored, { ...stored, name: 'GST' })).toMatch(/Tally's own groups/);
    expect(predefinedChangeProblem(stored, { ...stored, parentId: null, nature: 'LIABILITY' })).toMatch(/Tally's own groups/);
  });
});

describe('general ledgers', () => {
  const ledger = (facts: Partial<LedgerFacts>): LedgerFacts => ({ name: 'Truck', groupId: 'Fixed Assets', taxKind: null, systemRole: null, isArchived: false, ...facts });

  it('needs a group, except Profit & Loss A/c', () => {
    expect(ledgerProblem(ledger({}), groups)).toBeNull();
    expect(ledgerProblem(ledger({ groupId: null }), groups)).toMatch(/Pick the group/);
    expect(ledgerProblem(ledger({ groupId: null, systemRole: 'PROFIT_AND_LOSS' }), groups)).toBeNull();
  });

  it('holds a tax kind only under Duties & Taxes', () => {
    expect(ledgerProblem(ledger({ groupId: 'Duties & Taxes', taxKind: 'CGST' }), groups)).toBeNull();
    expect(ledgerProblem(ledger({ taxKind: 'CGST' }), groups)).toMatch(/Duties & Taxes/);
  });

  it('keeps a system ledger under its own group, with its name, live', () => {
    const roundOff = ledger({ name: 'Round Off', groupId: 'Indirect Expenses', systemRole: 'ROUND_OFF' });
    expect(ledgerProblem(roundOff, groups)).toBeNull();
    expect(ledgerProblem({ ...roundOff, groupId: 'Freight' }, groups)).toMatch(/stays under Indirect Expenses/);
    expect(systemChangeProblem(roundOff, { ...roundOff, name: 'Rounding' })).toMatch(/keeps its name/);
    expect(systemChangeProblem(roundOff, { ...roundOff, isArchived: true })).toMatch(/cannot be archived/);
    expect(systemChangeProblem(ledger({}), ledger({ name: 'Truck 2' }))).toBeNull();
  });
});
