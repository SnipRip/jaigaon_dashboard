// Row locks other modules take on shipments: an expense naming a shipment
// locks it (so a cancel waits), and an invoice cancel asks whether a live
// shipment carries it.
import { BadRequestException } from '@nestjs/common';
import type { Prisma, ShipmentStage } from '../generated/prisma/client.js';

type Tx = Prisma.TransactionClient;

/** Locks a shipment FOR UPDATE; refuses one that does not exist or is cancelled. */
export async function liveShipment(tx: Tx, id: string): Promise<{ number: string; stage: ShipmentStage; partyId: string; date: Date; vehicleId: string | null }> {
  const [row] = await tx.$queryRaw<{ number: string; stage: ShipmentStage; partyId: string; date: Date; vehicleId: string | null; cancelledAt: Date | null }[]>`
    SELECT "number", "stage", "partyId", "date", "vehicleId", "cancelledAt" FROM "Shipment" WHERE "id" = ${id}::uuid FOR UPDATE`;
  if (!row) throw new BadRequestException('That shipment does not exist');
  if (row.cancelledAt) throw new BadRequestException(`Shipment ${row.number} is cancelled`);
  return row;
}

/** The live shipment carrying an invoice, if any. */
export async function shipmentCarrying(tx: Tx, invoiceId: string): Promise<string | null> {
  const row = await tx.shipmentInvoice.findFirst({ where: { invoiceId, released: false }, select: { shipment: { select: { number: true } } } });
  return row?.shipment.number ?? null;
}
