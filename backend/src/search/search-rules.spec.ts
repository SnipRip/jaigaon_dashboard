import { describe, expect, it } from 'vitest';
import { everyWord, has, searchWords } from './search-rules.js';

describe('search rules', () => {
  it('splits the query into lower-case words, repeats and extra spaces dropped, five at most', () => {
    expect(searchWords('  TMT  12mm tmt ')).toEqual(['tmt', '12mm']);
    expect(searchWords('a b c d e f g')).toHaveLength(5);
    expect(searchWords('   ')).toEqual([]);
  });

  it('needs every word in one of the fields', () => {
    const filter = everyWord<{ number?: object; driverName?: object }>(['wb73', 'roy'], [(word) => ({ number: has(word) }), (word) => ({ driverName: has(word) })]);
    expect(filter).toEqual({
      AND: [
        { OR: [{ number: { contains: 'wb73', mode: 'insensitive' } }, { driverName: { contains: 'wb73', mode: 'insensitive' } }] },
        { OR: [{ number: { contains: 'roy', mode: 'insensitive' } }, { driverName: { contains: 'roy', mode: 'insensitive' } }] },
      ],
    });
  });
});
