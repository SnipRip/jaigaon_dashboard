// Shipment stage names and hints for the screens (the server holds the
// papers each stage needs: backend/src/shipments/shipment-rules.ts). No React.
import type { ShipmentStatus } from "./types";

export const SHIPMENT_STAGES: { status: ShipmentStatus; label: string; hint: string }[] = [
  { status: "planned", label: "Planned", hint: "Invoices picked, truck booked" },
  { status: "loading", label: "Loading", hint: "Goods going on the truck at our yard" },
  { status: "in-transit", label: "On the way", hint: "Left the yard with challan and e-way bill" },
  { status: "at-border", label: "At the border", hint: "At Jaigaon LCS, shipping bill filed by the agent" },
  { status: "cleared", label: "Customs cleared", hint: "LEO given, crossed into Phuentsholing" },
  { status: "delivered", label: "Delivered", hint: "Unloaded at the buyer's site" },
];

export const stageLabel = (status: ShipmentStatus) => SHIPMENT_STAGES.find((stage) => stage.status === status)?.label ?? status;

export const stageIndex = (status: ShipmentStatus) => SHIPMENT_STAGES.findIndex((stage) => stage.status === status);

/** The next stage, or undefined once delivered. */
export const nextStage = (status: ShipmentStatus) => SHIPMENT_STAGES[stageIndex(status) + 1]?.status;

export const shipmentNumber = (financialYear: string, sequence: number) =>
  `SHP/${financialYear.replace("-", "").slice(2)}/${String(sequence).padStart(4, "0")}`;
