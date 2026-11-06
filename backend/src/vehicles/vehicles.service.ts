import { BadRequestException, Injectable } from '@nestjs/common';
import { archivedFilter } from '../common/dto/archivable.js';
import { definedFields } from '../common/dto/defined-fields.js';
import { PrismaService } from '../database/prisma.service.js';
import { liveVendor } from '../purchases/purchase-context.js';
import type { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto.js';
import { settleVehicle, vehicleProblem } from './vehicle-rules.js';
import { toVehicleView, vehicleInclude, type VehicleView } from './vehicle-view.js';

/** Columns that must keep a value: null in an update is refused. */
const REQUIRED = { number: 'Vehicle number', type: 'Type', ownership: 'Ownership', isArchived: 'Archived' } as const;

const fail = (problem: string | null) => {
  if (problem) throw new BadRequestException(problem);
};

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(includeArchived?: boolean): Promise<VehicleView[]> {
    const rows = await this.prisma.vehicle.findMany({ where: archivedFilter(includeArchived), orderBy: { number: 'asc' }, include: vehicleInclude });
    return rows.map(toVehicleView);
  }

  async create(dto: CreateVehicleDto): Promise<VehicleView> {
    const data = settleVehicle({
      number: dto.number,
      type: dto.type,
      capacityTons: dto.capacityTons ?? null,
      ownership: dto.ownership,
      transporterId: dto.transporterId ?? null,
      driverName: dto.driverName ?? null,
      driverPhone: dto.driverPhone ?? null,
      notes: dto.notes ?? null,
    });
    fail(vehicleProblem(data));
    return this.prisma.$transaction(async (tx) => {
      if (data.transporterId) await liveVendor(tx, data.transporterId);
      return toVehicleView(await tx.vehicle.create({ data, include: vehicleInclude }));
    });
  }

  /** Merges what was sent onto the vehicle; a new transporter must be a live vendor. */
  async update(id: string, dto: UpdateVehicleDto): Promise<VehicleView> {
    const sent = definedFields(dto);
    for (const [key, label] of Object.entries(REQUIRED)) if (sent[key as keyof typeof REQUIRED] === null) fail(`${label} cannot be cleared`);
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.vehicle.findUniqueOrThrow({ where: { id } });
      const merged = settleVehicle({ ...current, ...sent, transporterId: sent.transporterId !== undefined ? sent.transporterId : current.transporterId });
      fail(vehicleProblem(merged));
      if (merged.transporterId && merged.transporterId !== current.transporterId) await liveVendor(tx, merged.transporterId);
      const { capacityTons, driverName, driverPhone, notes, number, type, ownership, isArchived, transporterId } = merged;
      return toVehicleView(
        await tx.vehicle.update({
          where: { id },
          data: { capacityTons, driverName, driverPhone, notes, number, type, ownership, isArchived, transporterId },
          include: vehicleInclude,
        }),
      );
    });
  }

  /** A vehicle a shipment used is in use (409 from the filter): archive it instead. */
  async remove(id: string): Promise<void> {
    await this.prisma.vehicle.delete({ where: { id } });
  }
}
