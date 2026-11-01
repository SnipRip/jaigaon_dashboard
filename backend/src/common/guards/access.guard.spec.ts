import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ADMIN_ONLY_KEY,
  ALLOW_PENDING_PASSWORD_KEY,
  REQUIRED_ACCESS_KEY,
} from '../decorators/require-access.decorator.js';
import type { AuthContext } from '../types/authenticated-request.js';
import { AccessGuard } from './access.guard.js';

const staff: AuthContext = {
  userId: 'u',
  sessionId: 's',
  role: 'STAFF',
  permissions: { '/items': ['view', 'create'] },
  mustChangePassword: false,
};

// A guard run against a route carrying the given metadata.
function run(auth: AuthContext | undefined, metadata: Record<string, unknown> = {}) {
  const reflector = new Reflector();
  vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => metadata[key as string]);
  const context = {
    switchToHttp: () => ({ getRequest: () => ({ auth }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
  return new AccessGuard(reflector).canActivate(context);
}

describe('AccessGuard', () => {
  it('lets public routes (no auth) and unmarked routes through', () => {
    expect(run(undefined)).toBe(true);
    expect(run(staff)).toBe(true);
  });

  it('checks the module action for staff', () => {
    expect(run(staff, { [REQUIRED_ACCESS_KEY]: { module: '/items', action: 'create' } })).toBe(true);
    expect(() => run(staff, { [REQUIRED_ACCESS_KEY]: { module: '/items', action: 'delete' } })).toThrow(ForbiddenException);
    expect(() => run(staff, { [REQUIRED_ACCESS_KEY]: { module: '/masters/units', action: 'view' } })).toThrow(ForbiddenException);
  });

  it('keeps admin-only routes for administrators, who pass every check', () => {
    expect(() => run(staff, { [ADMIN_ONLY_KEY]: true })).toThrow(ForbiddenException);
    const admin = { ...staff, role: 'ADMIN' as const, permissions: {} };
    expect(run(admin, { [ADMIN_ONLY_KEY]: true })).toBe(true);
    expect(run(admin, { [REQUIRED_ACCESS_KEY]: { module: '/items', action: 'delete' } })).toBe(true);
  });

  it('blocks everything but marked routes until a pending password is replaced', () => {
    const pending = { ...staff, role: 'ADMIN' as const, mustChangePassword: true };
    expect(() => run(pending)).toThrow(ForbiddenException);
    expect(run(pending, { [ALLOW_PENDING_PASSWORD_KEY]: true })).toBe(true);
  });
});
