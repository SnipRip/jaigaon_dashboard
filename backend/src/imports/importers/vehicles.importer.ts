// Vehicle master importer: number, type, capacity, own or hired, the
// transporter vendor by name or GSTIN, driver. Rows go through the vehicle
// DTOs and VehiclesService, so the same checks apply as on the screen.
import { normaliseVehicle } from '../../common/vehicle-number.js';
import type { PrismaService } from '../../database/prisma.service.js';
import { CreateVehicleDto, UpdateVehicleDto } from '../../vehicles/dto/vehicle.dto.js';
import type { VehicleView } from '../../vehicles/vehicle-view.js';
import type { VehiclesService } from '../../vehicles/vehicles.service.js';
import { VEHICLES_MODULE } from '../../vehicles/vehicles.controller.js';
import type { ImportColumn } from '../import-cells.js';
import { pick, validDto, type MasterImporter } from '../master-importer.js';

const TYPES = { TRUCK_10: '10-wheel truck', TRUCK_6: '6-wheel truck', TRAILER: 'Trailer', PICKUP: 'Pickup' };
const OWNERSHIP = { OWN: 'Own', HIRED: 'Hired' };

export function vehiclesImporter(vehicles: VehiclesService, prisma: PrismaService): MasterImporter<VehicleView> {
  const columns: ImportColumn<VehicleView>[] = [
    { header: 'Vehicle number', field: 'number', kind: 'text', required: true, hint: 'WB73E1234 or BG2A1234; spaces are dropped.', value: (vehicle) => vehicle.number },
    { header: 'Type', field: 'type', kind: 'choice', choices: TYPES, required: true, value: (vehicle) => TYPES[vehicle.type] },
    { header: 'Capacity (tons)', field: 'capacityTons', kind: 'number', value: (vehicle) => vehicle.capacityTons },
    { header: 'Ownership', field: 'ownership', kind: 'choice', choices: OWNERSHIP, required: true, value: (vehicle) => OWNERSHIP[vehicle.ownership] },
    { header: 'Transporter', field: 'transporterId', kind: 'ref', ref: 'vendor', hint: 'Hired vehicles: the vendor by name or GSTIN.', value: (vehicle, refs) => refs.nameOf('vendor', vehicle.transporterId) },
    { header: 'Driver', field: 'driverName', kind: 'text', value: (vehicle) => vehicle.driverName },
    { header: "Driver's phone", field: 'driverPhone', kind: 'text', value: (vehicle) => vehicle.driverPhone },
    { header: 'Notes', field: 'notes', kind: 'text', value: (vehicle) => vehicle.notes },
  ];
  return {
    key: 'vehicles',
    title: 'vehicles',
    module: VEHICLES_MODULE,
    columns,
    refs: ['vendor'],
    archivable: true,
    list: () => vehicles.list(true),
    findExisting: async (values) =>
      typeof values.number === 'string'
        ? ((await prisma.vehicle.findUnique({ where: { number: normaliseVehicle(values.number) } }))?.id ?? null)
        : null,
    create: async (values) => (await vehicles.create(await validDto(CreateVehicleDto, pick(values, columns.map((column) => column.field))))).id,
    update: async (id, values) => void (await vehicles.update(id, await validDto(UpdateVehicleDto, values))),
  };
}
