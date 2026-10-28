"use client";

import { StatusChip } from "@/components/ui/status-chip";
import { formatQuantity } from "@/lib/format";
import { RecordMaster } from "./record-master";
import type { Transporter } from "./types";

interface TransportersMasterProps {
  transporters: Transporter[];
  vendors: { id: string; displayName: string }[];
  /** Transporter id → vehicles on record. */
  vehicleCounts: Record<string, number>;
}

export function TransportersMaster({ transporters, vendors, vehicleCounts }: TransportersMasterProps) {
  const vendorName = (id?: string) => vendors.find((vendor) => vendor.id === id)?.displayName;
  return (
    <RecordMaster
      noun={["transporter", "transporters"]}
      initialRecords={transporters}
      nameKey="name"
      blank={{ isGta: true }}
      fields={[
        { key: "name", label: "Name", kind: "text", required: true },
        {
          key: "transporterId",
          label: "Transporter ID",
          kind: "text",
          required: true,
          upperCase: true,
          pattern: /^[0-9A-Za-z]{15}$/,
          message: "15 characters: GSTIN or TRANSIN",
          hint: "GSTIN, or TRANSIN if unregistered. Goes on the e-way bill",
        },
        { key: "phone", label: "Phone", kind: "text", pattern: /^\+?\d{10,13}$/, message: "10 to 13 digits" },
        { key: "vendorId", label: "Bills entered against vendor", kind: "select", options: vendors.map((vendor) => ({ value: vendor.id, label: vendor.displayName })) },
        { key: "isGta", label: "How they bill freight", kind: "toggle", onLabel: "GTA, reverse charge", offLabel: "Forward charge or no GST", wide: true },
        { key: "notes", label: "Notes", kind: "text", wide: true },
      ]}
      columns={[
        { label: "Transporter", render: (transporter) => transporter.name },
        { label: "Transporter ID", render: (transporter) => transporter.transporterId },
        {
          label: "Freight GST",
          render: (transporter) => <StatusChip tone={transporter.isGta ? "warning" : "neutral"}>{transporter.isGta ? "Reverse charge" : "Forward / none"}</StatusChip>,
        },
        { label: "Vendor record", render: (transporter) => vendorName(transporter.vendorId) ?? <span className="text-muted">Not linked</span> },
        { label: "Vehicles", render: (transporter) => vehicleCounts[transporter.id] ?? 0, align: "right" },
      ]}
      searchText={(transporter) => `${transporter.name} ${transporter.transporterId} ${transporter.phone ?? ""}`}
      filters={[
        { label: "Reverse charge (GTA)", test: (transporter) => transporter.isGta },
        { label: "Not linked to a vendor", test: (transporter) => !transporter.vendorId },
      ]}
      stats={(records) => [
        { label: "Transporters", value: formatQuantity(records.length) },
        { label: "Under reverse charge", value: formatQuantity(records.filter((transporter) => transporter.isGta).length) },
        { label: "Linked to a vendor", value: formatQuantity(records.filter((transporter) => transporter.vendorId).length) },
        { label: "Vehicles on record", value: formatQuantity(Object.values(vehicleCounts).reduce((sum, count) => sum + count, 0)) },
      ]}
      importColumns={["Name", "Transporter ID", "Phone", "GTA (Y/N)", "Notes"]}
      footnote="Picked on shipments and e-way bills. Link the vendor record so freight bills land on the right ledger."
    />
  );
}
