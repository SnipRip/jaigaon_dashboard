import { describe, expect, it } from 'vitest';
import { reasonProblem, repeatedItem, transferProblem, valueAt } from './stock-move-rules.js';

describe('reasonProblem', () => {
  it('lets each reason go its own way and OTHER either way', () => {
    expect(reasonProblem('OUT', 'DAMAGED')).toBeNull();
    expect(reasonProblem('IN', 'FOUND')).toBeNull();
    expect(reasonProblem('IN', 'OTHER')).toBeNull();
    expect(reasonProblem('OUT', 'OTHER')).toBeNull();
  });

  it('refuses a reason in the wrong direction', () => {
    expect(reasonProblem('IN', 'DAMAGED')).toBe('Stock damaged is taken out, not added');
    expect(reasonProblem('OUT', 'COUNT_EXCESS')).toBe('Stock more on a count is added, not taken out');
  });
});

describe('repeatedItem', () => {
  it('finds the first item listed twice', () => {
    expect(repeatedItem(['a', 'b', 'a'])).toBe('a');
    expect(repeatedItem(['a', 'b'])).toBeNull();
  });
});

describe('transferProblem', () => {
  it('needs two different godowns', () => {
    expect(transferProblem('g1', 'g1')).toBe('Pick two different godowns');
    expect(transferProblem('g1', 'g2')).toBeNull();
  });
});

describe('valueAt', () => {
  it('rounds to paise', () => {
    expect(valueAt(3.333, 56.4157)).toBe(188.03);
  });
});
