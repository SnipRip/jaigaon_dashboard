// The vehicle a shipment, invoice or stock transfer carries: picked from the
// vehicle master or typed. A picked one is locked FOR SHARE (it cannot be
// renamed or archived under the save) and its master number is recorded.
import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';

/**
 * The number to store. An archived vehicle is refused unless the document
 * already had it (`currentVehicleId`, when an edit keeps the same truck).
 */
export async function pickedVehicleNumber<T extends string | null>(
  tx: Prisma.TransactionClient,
  vehicleId: string | null | undefined,
  typedNumber: T,
  currentVehicleId: string | null = null,
): Promise<string | T> {
  if (!vehicleId) return typedNumber;
  const [vehicle] = await tx.$queryRaw<{ number: string; isArchived: boolean }[]>`
    SELECT "number", "isArchived" FROM "Vehicle" WHERE "id" = ${vehicleId}::uuid FOR SHARE`;
  if (!vehicle) throw new BadRequestException('That vehicle is not in the vehicle master');
  if (vehicle.isArchived && vehicleId !== currentVehicleId) throw new BadRequestException('This vehicle is archived');
  return vehicle.number;
}
