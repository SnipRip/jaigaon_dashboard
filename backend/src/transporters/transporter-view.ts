// A transport vendor as the transporters view returns it. A transporter is a
// vendor (Party): no table of its own, so freight bills, vehicles and
// shipments all point at the same record.
import { isoDate } from '../common/dates.js';
import type { Prisma } from '../generated/prisma/client.js';

/** Vendors that bill freight as a GTA, own a hired vehicle on the master, or carried a shipment. */
export const transporterWhere = {
  isVendor: true,
  OR: [{ isGta: true }, { vehicles: { some: {} } }, { shipmentsTransported: { some: {} } }],
} as const satisfies Prisma.PartyWhereInput;

export const transporterSelect = {
  id: true,
  displayName: true,
  contactPerson: true,
  phone: true,
  treatment: true,
  gstin: true,
  isGta: true,
  isArchived: true,
  _count: {
    select: {
      vehicles: { where: { isArchived: false } },
      shipmentsTransported: { where: { cancelledAt: null } },
    },
  },
  shipmentsTransported: { where: { cancelledAt: null }, orderBy: { date: 'desc' }, take: 1, select: { date: true } },
} as const satisfies Prisma.PartySelect;

type TransporterRow = Prisma.PartyGetPayload<{ select: typeof transporterSelect }>;

export const toTransporterView = ({ _count, shipmentsTransported, ...party }: TransporterRow) => ({
  ...party,
  /** Live vehicles on the vehicle master. */
  vehicleCount: _count.vehicles,
  /** Shipments carried, cancelled ones left out. */
  shipmentCount: _count.shipmentsTransported,
  /** YYYY-MM-DD. */
  lastShipmentDate: shipmentsTransported[0] ? isoDate(shipmentsTransported[0].date) : null,
});

export type TransporterView = ReturnType<typeof toTransporterView>;
