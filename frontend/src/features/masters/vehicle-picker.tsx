"use client";

import useSWR from "swr";
import { SelectField } from "@/components/ui/select-field";
import { apiGet } from "@/lib/api-client";
import type { VehicleView } from "@/types/vehicle";
import { VEHICLES_PATH } from "./masters-api";

/** Radix Select takes no empty value: the "typed in" choice. */
const TYPED = "typed";

/** Hint under the vehicle number once it comes from the master (the field is then read-only). */
export const PICKED_VEHICLE_HINT = "From the vehicle master";

/** Live vehicles for a new document (an archived one cannot be newly picked). Empty while loading. */
export function useLiveVehicles(): VehicleView[] {
  return useSWR<VehicleView[]>(VEHICLES_PATH, apiGet).data ?? [];
}

interface VehicleSelectProps {
  vehicles: VehicleView[];
  /** Empty: typed, not from the master. */
  vehicleId: string;
  onPick: (vehicle: VehicleView | null) => void;
}

// The "Vehicle" picker on shipments, invoices and stock transfers. Picking
// one fills the number (the server records the master's number), "Not on the
// list" lets the number be typed.
export function VehicleSelect({ vehicles, vehicleId, onPick }: VehicleSelectProps) {
  return (
    <SelectField
      label="Vehicle"
      options={[
        { value: TYPED, label: "Not on the list" },
        ...vehicles.map((vehicle) => ({ value: vehicle.id, label: `${vehicle.number} · ${vehicle.ownership === "OWN" ? "own" : (vehicle.transporterName ?? "hired")}` })),
      ]}
      value={vehicleId || TYPED}
      onValueChange={(value) => onPick(vehicles.find((vehicle) => vehicle.id === value) ?? null)}
    />
  );
}
