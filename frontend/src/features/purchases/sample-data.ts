// SAMPLE DATA for vendor bills: invented bills from the sample vendors, with
// lines at the sample items' cost price. PUR/2627/0012 is the walkthrough's
// case (27 Oct 2026): a truck of pipes and wire with a separate freight bill
// and a separate unloading and labour slip. Every number is a placeholder.
import { hsnCodes } from "@/features/hsn/sample-data";
import { resolveItemDefaults } from "@/features/items/item-rules";
import { categories, itemGroups, items } from "@/features/items/sample-data";
import type { Bill, BillLine } from "./types";

const catalog = { categories, groups: itemGroups, items, hsnCodes };

/** A bill line for a sample item at its cost price. */
function costLine(itemId: string, quantity: number, rate?: number, itc: BillLine["itc"] = "eligible"): BillLine {
  const item = items.find((candidate) => candidate.id === itemId)!;
  const defaults = resolveItemDefaults(catalog, item);
  return {
    itemId,
    description: item.name,
    hsn: defaults.hsn.value ?? "",
    quantity,
    unit: defaults.unit.value ?? "",
    rate: rate ?? item.costPrice,
    discountPct: 0,
    gstRatePct: defaults.gstRatePct.value ?? 0,
    itc,
  };
}

const bill = (seed: Omit<Bill, "charges" | "allocation" | "paid" | "status"> & Partial<Pick<Bill, "charges" | "allocation" | "paid" | "status">>): Bill => ({
  charges: [],
  allocation: "value",
  paid: 0,
  status: "open",
  ...seed,
});

export const bills: Bill[] = [
  bill({
    id: "pur-2627-0011",
    kind: "goods",
    reference: "PUR/2627/0011",
    vendorBillNumber: "HSD/26-27/1182",
    date: "2026-10-05",
    dueDate: "2026-11-04",
    vendorId: "hind-steel",
    sourceOfSupply: "19",
    lines: [costLine("tmt-12", 4000), costLine("tmt-16", 3000)],
    ewayBill: { number: "381000000011", date: "2026-10-05", vehicleNumber: "WB37C4410" },
    allocation: "weight",
    fileName: "hind-steel-1182.pdf",
  }),
  bill({
    id: "pur-2627-0012",
    kind: "goods",
    reference: "PUR/2627/0012",
    vendorBillNumber: "BBPL/0457",
    date: "2026-10-09",
    dueDate: "2026-11-23",
    vendorId: "bhoomi-buildings",
    sourceOfSupply: "19",
    lines: [costLine("round-pipe-40", 3200), costLine("square-pipe-40", 1800), costLine("gi-wire", 900)],
    ewayBill: { number: "381000000012", date: "2026-10-09", vehicleNumber: "WB73D2051" },
    allocation: "weight",
    paid: 200000,
    notes: "Truck of pipes and GI wire. Freight and unloading billed separately.",
  }),
  bill({
    id: "pur-2627-0013",
    kind: "goods",
    reference: "PUR/2627/0013",
    vendorBillNumber: "MAAC-2610-77",
    date: "2026-10-11",
    dueDate: "2026-11-10",
    vendorId: "magadh-aac",
    sourceOfSupply: "10",
    lines: [costLine("aac-200", 1500), costLine("aac-150", 800)],
    charges: [
      { head: "freight", description: "Patna to Jaigaon, on the bill", amount: 16500 },
      { head: "loading", amount: 1800 },
    ],
    ewayBill: { number: "381000000013", date: "2026-10-11", vehicleNumber: "BR01GK7781" },
    paid: 203550,
  }),
  bill({
    id: "pur-2627-0014",
    kind: "goods",
    reference: "PUR/2627/0014",
    vendorBillNumber: "DSC/112",
    date: "2026-10-12",
    dueDate: "2026-10-19",
    vendorId: "dooars-stone",
    sourceOfSupply: "19",
    lines: [costLine("chips-white-0", 60), costLine("chips-black-2b", 20)],
    notes: "Bill of supply: composition dealer.",
  }),
  bill({
    id: "pur-2627-0015",
    kind: "goods",
    reference: "PUR/2627/0015",
    vendorBillNumber: "Slip 56",
    date: "2026-10-16",
    dueDate: "2026-10-16",
    vendorId: "kalchini-bricks",
    sourceOfSupply: "19",
    lines: [costLine("brick-1", 8000)],
    allocation: "quantity",
    paid: 73600,
  }),
  bill({
    id: "pur-2627-0016",
    kind: "goods",
    reference: "PUR/2627/0016",
    vendorBillNumber: "DHC/2026/889",
    date: "2026-10-24",
    dueDate: "2026-11-23",
    vendorId: "dhanbad-hardware",
    sourceOfSupply: "20",
    lines: [costLine("nut-bolt", 2000), costLine("wheelbarrow", 1, 2850, "ineligible")],
    status: "draft",
    notes: "The wheel barrow is a gift to a site engineer: GST not claimable (Section 17(5)).",
  }),
  bill({
    id: "pur-2627-0017",
    kind: "charges",
    reference: "PUR/2627/0017",
    vendorBillNumber: "RTL/LR/3391",
    date: "2026-10-09",
    dueDate: "2026-10-24",
    vendorId: "royal-transport",
    sourceOfSupply: "19",
    lines: [],
    charges: [{ head: "freight", description: "Siliguri to Jaigaon, truck WB73D2051", amount: 18000, gstRatePct: 5 }],
    landedCostFor: "pur-2627-0012",
    paid: 18000,
  }),
  bill({
    id: "pur-2627-0018",
    kind: "charges",
    reference: "PUR/2627/0018",
    vendorBillNumber: "Slip 0912",
    date: "2026-10-10",
    dueDate: "2026-10-10",
    vendorId: "jaigaon-loaders",
    sourceOfSupply: "19",
    lines: [],
    charges: [
      { head: "unloading", description: "6 men, half day", amount: 3200, gstRatePct: 0 },
      { head: "labour", description: "Stacking pipes in the yard", amount: 1800, gstRatePct: 0 },
    ],
    landedCostFor: "pur-2627-0012",
    paid: 5000,
  }),
  bill({
    id: "pur-2627-0019",
    kind: "charges",
    reference: "PUR/2627/0019",
    vendorBillNumber: "RTL/LR/3357",
    date: "2026-10-05",
    dueDate: "2026-10-20",
    vendorId: "royal-transport",
    sourceOfSupply: "19",
    lines: [],
    charges: [{ head: "freight", description: "Durgapur to Jaigaon, truck WB37C4410", amount: 21500, gstRatePct: 5 }],
    landedCostFor: "pur-2627-0011",
  }),
];

/** Next number in the PUR series for the sample financial year. */
export const nextBillSequence = 20;
