import { describe, expect, it } from 'vitest';
import type { Prisma } from '../generated/prisma/client.js';
import { pickedVehicleNumber } from './picked-vehicle.js';

/** A transaction whose FOR SHARE read returns these rows. */
const txReturning = (rows: { number: string; isArchived: boolean }[]) =>
  ({ $queryRaw: () => Promise.resolve(rows) }) as unknown as Prisma.TransactionClient;

const ID = '6f1c2b1e-0000-4000-8000-000000000001';

describe('pickedVehicleNumber', () => {
  it('keeps the typed number when nothing was picked', async () => {
    expect(await pickedVehicleNumber(txReturning([]), null, 'WB73E1234')).toBe('WB73E1234');
    expect(await pickedVehicleNumber(txReturning([]), undefined, null)).toBeNull();
  });

  it("records the master's number over the typed one", async () => {
    expect(await pickedVehicleNumber(txReturning([{ number: 'BG2A1234', isArchived: false }]), ID, 'WB73E1234')).toBe('BG2A1234');
  });

  it('refuses a vehicle not on the master', async () => {
    await expect(pickedVehicleNumber(txReturning([]), ID, null)).rejects.toThrow('not in the vehicle master');
  });

  it('refuses an archived vehicle unless the document already had it', async () => {
    const archived = txReturning([{ number: 'WB73E1234', isArchived: true }]);
    await expect(pickedVehicleNumber(archived, ID, null)).rejects.toThrow('archived');
    expect(await pickedVehicleNumber(archived, ID, null, ID)).toBe('WB73E1234');
  });
});
