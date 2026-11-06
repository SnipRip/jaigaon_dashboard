"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { LoadNotice } from "@/components/ui/load-notice";
import { StatusChip } from "@/components/ui/status-chip";
import { PARTIES_PATH } from "@/features/parties/parties-api";
import { apiGet } from "@/lib/api-client";
import { formatQuantity } from "@/lib/format";
import type { PartyView } from "@/types/party";
import type { VehicleView } from "@/types/vehicle";
import { toVehicle, vehiclePersistence, VEHICLES_PATH, withArchived } from "./masters-api";
import { RecordMaster } from "./record-master";
import type { Vehicle } from "./types";

export const VEHICLE_TYPES: { value: Vehicle["type"]; label: string }[] = [
  { value: "truck-10", label: "10-wheel truck" },
  { value: "truck-6", label: "6-wheel truck" },
  { value: "trailer", label: "Trailer" },
  { value: "pickup", label: "Pickup" },
];

/** Vendors, archived ones too so an old transporter keeps its name. */
const VENDORS_PATH = `${PARTIES_PATH}?role=vendor&includeArchived=true`;
const HIRED = { key: "ownership", values: ["hired"] };

// Vehicle master (real): own trucks and transporters' trucks. The shipment
// form picks from it and fills the transporter and driver.
export function VehiclesMaster() {
  const vehicles = useSWR<VehicleView[]>(withArchived(VEHICLES_PATH), apiGet);
  const vendors = useSWR<PartyView[]>(VENDORS_PATH, apiGet);
  const records = useMemo(() => vehicles.data?.map(toVehicle), [vehicles.data]);
  if (!records || !vendors.data) return <LoadNotice error={vehicles.error ?? vendors.error} what="vehicles" />;

  const transporterOptions = vendors.data.map((vendor) => ({
    value: vendor.id,
    label: vendor.isArchived ? `${vendor.displayName} (archived)` : vendor.displayName,
  }));

  return (
    <RecordMaster
      noun={["vehicle", "vehicles"]}
      initialRecords={records}
      persist={vehiclePersistence(() => void vehicles.mutate())}
      nameKey="number"
      blank={{ type: "truck-10", ownership: "hired" }}
      fields={[
        {
          key: "number",
          label: "Vehicle number",
          kind: "text",
          required: true,
          upperCase: true,
          pattern: /^[A-Za-z]{2}-?\d{1,2}-?[A-Za-z]{0,3}-?\d{4}$/,
          message: "Like WB73E1234 or BG2A1234, no spaces",
        },
        { key: "type", label: "Type", kind: "select", options: VEHICLE_TYPES, required: true },
        { key: "capacityTons", label: "Capacity (tons)", kind: "number", decimals: 1 },
        {
          key: "ownership",
          label: "Ownership",
          kind: "select",
          required: true,
          options: [
            { value: "own", label: "Our own" },
            { value: "hired", label: "Hired from a transporter" },
          ],
        },
        { key: "transporterId", label: "Transporter (vendor)", kind: "select", options: transporterOptions, showWhen: HIRED },
        { key: "driverName", label: "Driver", kind: "text" },
        { key: "driverPhone", label: "Driver's phone", kind: "text", pattern: /^\+?\d{8,13}$/, message: "8 to 13 digits" },
        { key: "notes", label: "Notes", kind: "text", wide: true },
      ]}
      columns={[
        { label: "Vehicle", render: (vehicle) => vehicle.number },
        { label: "Type", render: (vehicle) => VEHICLE_TYPES.find((type) => type.value === vehicle.type)?.label },
        { label: "Capacity", render: (vehicle) => (vehicle.capacityTons ? `${formatQuantity(vehicle.capacityTons)} t` : "–"), align: "right" },
        { label: "Owner", render: (vehicle) => (vehicle.ownership === "own" ? <StatusChip tone="brand">Own</StatusChip> : (vehicle.transporterName ?? "Hired")) },
        { label: "Driver", render: (vehicle) => [vehicle.driverName, vehicle.driverPhone].filter(Boolean).join(" · ") || "–" },
        { label: "Shipments", render: (vehicle) => formatQuantity(vehicle.shipmentCount ?? 0), align: "right" },
      ]}
      searchText={(vehicle) => `${vehicle.number} ${vehicle.driverName ?? ""} ${vehicle.driverPhone ?? ""} ${vehicle.transporterName ?? ""}`}
      filters={[
        { label: "Own", test: (vehicle) => vehicle.ownership === "own" },
        { label: "Hired", test: (vehicle) => vehicle.ownership === "hired" },
      ]}
      stats={(list) => [
        { label: "Vehicles", value: formatQuantity(list.length) },
        { label: "Own", value: formatQuantity(list.filter((vehicle) => vehicle.ownership === "own").length) },
        { label: "Hired", value: formatQuantity(list.filter((vehicle) => vehicle.ownership === "hired").length) },
        { label: "Total capacity", value: `${formatQuantity(list.reduce((sum, vehicle) => sum + (vehicle.capacityTons ?? 0), 0))} t` },
      ]}
      importMaster="vehicles"
      footnote="Shipments pick from this list and take its transporter and driver. A vehicle that has carried a shipment is archived, not deleted."
    />
  );
}
