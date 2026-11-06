// A vehicle as the API returns it.
import { toNumber } from '../common/decimal.js';
import type { Prisma } from '../generated/prisma/client.js';

export const vehicleInclude = {
  transporter: { select: { displayName: true } },
  _count: { select: { shipments: true } },
} as const satisfies Prisma.VehicleInclude;

type VehicleRow = Prisma.VehicleGetPayload<{ include: typeof vehicleInclude }>;

export const toVehicleView = ({ transporter, _count, capacityTons, ...vehicle }: VehicleRow) => ({
  ...vehicle,
  capacityTons: capacityTons === null ? null : toNumber(capacityTons),
  transporterName: transporter?.displayName ?? null,
  /** Shipments that carried it (cancelled ones too): a used vehicle is archived, not deleted. */
  shipmentCount: _count.shipments,
});

export type VehicleView = ReturnType<typeof toVehicleView>;
