import { hashSessionToken } from './session.service.js';

describe('hashSessionToken', () => {
  it('is deterministic, so a cookie token can be looked up by its hash', () => {
    expect(hashSessionToken('token-a')).toBe(hashSessionToken('token-a'));
  });

  it('never stores the token itself', () => {
    const hash = hashSessionToken('token-a');
    expect(hash).not.toContain('token-a');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
