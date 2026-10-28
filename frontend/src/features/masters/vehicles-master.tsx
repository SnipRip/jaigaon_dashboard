"use client";

import { StatusChip } from "@/components/ui/status-chip";
import { formatQuantity } from "@/lib/format";
import { RecordMaster } from "./record-master";
import type { Vehicle } from "./types";

export const VEHICLE_TYPES: { value: Vehicle["type"]; label: string }[] = [
  { value: "truck-10", label: "10-wheel truck" },
  { value: "truck-6", label: "6-wheel truck" },
  { value: "trailer", label: "Trailer" },
  { value: "pickup", label: "Pickup" },
];

interface VehiclesMasterProps {
  vehicles: Vehicle[];
  transporters: { id: string; name: string }[];
}

export function VehiclesMaster({ vehicles, transporters }: VehiclesMasterProps) {
  const transporterName = (id?: string) => transporters.find((transporter) => transporter.id === id)?.name;
  return (
    <RecordMaster
      noun={["vehicle", "vehicles"]}
      initialRecords={vehicles}
      nameKey="number"
      blank={{ type: "truck-10", ownership: "hired" }}
      fields={[
        {
          key: "number",
          label: "Vehicle number",
          kind: "text",
          required: true,
          upperCase: true,
          pattern: /^[A-Za-z]{2}\d{1,2}[A-Za-z]{0,3}\d{4}$/,
          message: "Like WB73E1234, no spaces",
        },
        { key: "type", label: "Type", kind: "select", options: VEHICLE_TYPES, required: true },
        { key: "capacityTons", label: "Capacity (tons)", kind: "number", required: true, decimals: 1 },
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
        { key: "transporterId", label: "Transporter", kind: "select", options: transporters.map((transporter) => ({ value: transporter.id, label: transporter.name })) },
        { key: "driverName", label: "Driver", kind: "text" },
        { key: "driverPhone", label: "Driver's phone", kind: "text", pattern: /^\+?\d{10,13}$/, message: "10 to 13 digits" },
      ]}
      columns={[
        { label: "Vehicle", render: (vehicle) => vehicle.number },
        { label: "Type", render: (vehicle) => VEHICLE_TYPES.find((type) => type.value === vehicle.type)?.label },
        { label: "Capacity", render: (vehicle) => `${vehicle.capacityTons} t`, align: "right" },
        {
          label: "Owner",
          render: (vehicle) => (vehicle.ownership === "own" ? <StatusChip tone="brand">Own</StatusChip> : (transporterName(vehicle.transporterId) ?? "Hired")),
        },
        { label: "Driver", render: (vehicle) => (vehicle.driverName ? `${vehicle.driverName} · ${vehicle.driverPhone ?? ""}` : "–") },
      ]}
      searchText={(vehicle) => `${vehicle.number} ${vehicle.driverName ?? ""} ${transporterName(vehicle.transporterId) ?? ""}`}
      filters={[
        { label: "Own", test: (vehicle) => vehicle.ownership === "own" },
        { label: "Hired", test: (vehicle) => vehicle.ownership === "hired" },
      ]}
      stats={(records) => [
        { label: "Vehicles", value: formatQuantity(records.length) },
        { label: "Own", value: formatQuantity(records.filter((vehicle) => vehicle.ownership === "own").length) },
        { label: "Hired", value: formatQuantity(records.filter((vehicle) => vehicle.ownership === "hired").length) },
        { label: "Total capacity", value: `${formatQuantity(records.reduce((sum, vehicle) => sum + vehicle.capacityTons, 0))} t` },
      ]}
      importColumns={["Vehicle number", "Type", "Capacity (tons)", "Own / hired", "Transporter", "Driver", "Driver's phone"]}
      footnote="Picked on invoices, e-way bills and shipments; global search finds documents by vehicle number."
    />
  );
}
