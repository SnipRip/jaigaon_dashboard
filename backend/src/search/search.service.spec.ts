import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../common/types/authenticated-request.js';
import type { PrismaService } from '../database/prisma.service.js';
import { SearchService } from './search.service.js';

/** A Prisma stand-in that records which tables were searched and finds nothing. */
function fakePrisma() {
  const searched: string[] = [];
  const table = (name: string) => ({
    findMany: () => {
      searched.push(name);
      return Promise.resolve([]);
    },
  });
  const names = ['item', 'party', 'quotation', 'invoice', 'invoiceDocument', 'purchaseBill', 'shipment', 'stockTransfer', 'settlement', 'expense', 'vehicle'];
  return { prisma: Object.fromEntries(names.map((name) => [name, table(name)])) as unknown as PrismaService, searched };
}

const auth = (role: AuthContext['role'], permissions: AuthContext['permissions'] = {}): AuthContext => ({
  userId: 'u',
  role,
  sessionId: 's',
  permissions,
  mustChangePassword: false,
});

describe('SearchService', () => {
  it('searches only the screens the role may view', async () => {
    const { prisma, searched } = fakePrisma();
    await new SearchService(prisma).search(auth('STAFF', { '/invoices': ['view'], '/vendors': ['view'], '/shipments': ['create'] }), 'wb73');
    expect(searched.sort()).toEqual(['invoice', 'invoiceDocument', 'party']);
  });

  it('searches everything for an administrator, nothing for a blank query', async () => {
    const admin = fakePrisma();
    await new SearchService(admin.prisma).search(auth('ADMIN'), 'wb73');
    expect(admin.searched).toHaveLength(11);
    const blank = fakePrisma();
    expect(await new SearchService(blank.prisma).search(auth('ADMIN'), '   ')).toEqual([]);
    expect(blank.searched).toEqual([]);
  });
});
