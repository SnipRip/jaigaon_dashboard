import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../common/types/authenticated-request.js';
import type { PrismaService } from '../database/prisma.service.js';
import type { ProfitService } from '../profit/profit.service.js';
import type { SettlementsService } from '../settlements/settlements.service.js';
import { ReportsService } from './reports.service.js';

const staff = (permissions: AuthContext['permissions']): AuthContext => ({ userId: 'u', role: 'STAFF', sessionId: 's', permissions, mustChangePassword: false });

/** Reads nothing: only the access checks are under test here. */
const service = () =>
  new ReportsService(
    { invoice: { findMany: () => Promise.resolve([]) } } as unknown as PrismaService,
    {} as ProfitService,
    {} as SettlementsService,
  );

describe('ReportsService access', () => {
  it('refuses an unknown report', async () => {
    await expect(service().report(staff({ '/reports': ['view'] }), 'payroll', {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('needs Reports and every screen the report reads', async () => {
    await expect(service().report(staff({ '/reports': ['view'] }), 'sales-register', {})).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service().report(staff({ '/invoices': ['view'] }), 'sales-register', {})).rejects.toBeInstanceOf(ForbiddenException);
    const allowed = await service().report(staff({ '/reports': ['view'], '/invoices': ['view'] }), 'sales-register', { from: '2026-04-01', to: '2026-11-06' });
    expect(allowed).toEqual({ from: '2026-04-01', to: '2026-11-06', rows: [] });
  });

  it('refuses a period that ends before it starts', async () => {
    await expect(service().report(staff({ '/reports': ['view'], '/invoices': ['view'] }), 'sales-register', { from: '2026-11-06', to: '2026-04-01' })).rejects.toThrow('first day is after');
  });
});
