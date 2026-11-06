// Vehicle master rules (masters-plan.md row 9). Pure, so the spec covers them.
import type { VehicleOwnership } from '../generated/prisma/enums.js';

export interface VehicleFacts {
  ownership: VehicleOwnership;
  transporterId: string | null;
}

/** Our own truck has no transporter: switching to OWN drops it. */
export const settleVehicle = <T extends VehicleFacts>(vehicle: T): T =>
  vehicle.ownership === 'OWN' ? { ...vehicle, transporterId: null } : vehicle;

/** Why a vehicle cannot be saved as it is, or null. */
export function vehicleProblem(vehicle: VehicleFacts): string | null {
  if (vehicle.ownership === 'OWN' && vehicle.transporterId) return 'Our own vehicle has no transporter';
  return null;
}
