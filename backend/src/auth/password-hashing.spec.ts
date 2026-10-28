import { hashPassword, verifyPassword } from './password-hashing.js';
import { PASSWORD_PATTERN } from './password-policy.js';

describe('password hashing', () => {
  it('verifies the right password and rejects a wrong one', async () => {
    const hash = await hashPassword('Correct-Horse-42');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(await verifyPassword(hash, 'Correct-Horse-42')).toBe(true);
    expect(await verifyPassword(hash, 'correct-horse-42')).toBe(false);
  });

  it('treats a malformed stored hash as a failed match', async () => {
    expect(await verifyPassword('not-a-hash', 'anything')).toBe(false);
  });
});

describe('password policy', () => {
  it('requires a letter, a number and a symbol', () => {
    expect(PASSWORD_PATTERN.test('Abcdefgh1234!')).toBe(true);
    expect(PASSWORD_PATTERN.test('Abcdefgh12345')).toBe(false);
    expect(PASSWORD_PATTERN.test('abcdefghijkl!')).toBe(false);
  });
});
