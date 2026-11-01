import { parsePermissions, readStoredPermissions } from './module-permissions.js';

describe('parsePermissions', () => {
  it('orders actions, drops repeats, and adds view to any grant', () => {
    expect(parsePermissions({ '/items': ['edit', 'create', 'edit'], '/users': [] })).toEqual({
      '/items': ['view', 'create', 'edit'],
      '/users': [],
    });
  });

  it('rejects unknown actions, odd module keys and non-objects', () => {
    expect(() => parsePermissions({ '/items': ['approve'] })).toThrow();
    expect(() => parsePermissions({ items: ['view'] })).toThrow();
    expect(() => parsePermissions({ '/Items/../x': ['view'] })).toThrow();
    expect(() => parsePermissions(['view'])).toThrow();
    expect(() => parsePermissions(null)).toThrow();
  });
});

describe('readStoredPermissions', () => {
  it('grants nothing for a malformed stored value', () => {
    expect(readStoredPermissions('oops')).toEqual({});
    expect(readStoredPermissions({ '/items': ['view'] })).toEqual({ '/items': ['view'] });
  });
});
