"use client";

import { StatusChip } from "@/components/ui/status-chip";
import { formatQuantity } from "@/lib/format";
import { RecordMaster } from "./record-master";
import type { Godown } from "./types";

const KINDS = [
  { value: "store", label: "Store" },
  { value: "yard", label: "Open yard" },
  { value: "site", label: "Customer site" },
];

export function GodownsMaster({ godowns }: { godowns: Godown[] }) {
  return (
    <RecordMaster
      noun={["godown", "godowns"]}
      initialRecords={godowns}
      nameKey="name"
      blank={{ kind: "store", isDefault: false }}
      fields={[
        { key: "name", label: "Name", kind: "text", required: true, placeholder: "M.G. Road store" },
        { key: "kind", label: "Kind", kind: "select", options: KINDS, required: true },
        { key: "address", label: "Address", kind: "text", required: true, wide: true },
        { key: "inCharge", label: "In charge", kind: "text" },
        { key: "phone", label: "Phone", kind: "text", pattern: /^\+?\d{10,13}$/, message: "10 to 13 digits" },
        { key: "isDefault", label: "Default for purchases and sales", kind: "toggle", onLabel: "Default", offLabel: "Not default", wide: true },
      ]}
      columns={[
        { label: "Godown", render: (godown) => godown.name },
        { label: "Kind", render: (godown) => KINDS.find((kind) => kind.value === godown.kind)?.label },
        { label: "Address", render: (godown) => <span className="text-ink-soft">{godown.address}</span> },
        { label: "In charge", render: (godown) => godown.inCharge ?? "–" },
        { label: "Default", render: (godown) => (godown.isDefault ? <StatusChip tone="brand">Default</StatusChip> : null) },
      ]}
      searchText={(godown) => `${godown.name} ${godown.address} ${godown.inCharge ?? ""}`}
      stats={(records) => [
        { label: "Godowns", value: formatQuantity(records.length) },
        { label: "Stores", value: formatQuantity(records.filter((godown) => godown.kind === "store").length) },
        { label: "Yards", value: formatQuantity(records.filter((godown) => godown.kind === "yard").length) },
        { label: "Default", value: records.find((godown) => godown.isDefault)?.name ?? "None" },
      ]}
      importColumns={["Name", "Kind", "Address", "In charge", "Phone"]}
      footnote="Stock is held per godown once stock moves are recorded; until then items show one total."
    />
  );
}
