// SAMPLE DATA for sales invoices: invented invoices to sample customers, with
// lines priced from the sample items. Every number (invoice, e-way bill,
// shipping bill, LEO, BRC, LUT) is a placeholder, not a real document.
import { hsnCodes } from "@/features/hsn/sample-data";
import { resolveItemDefaults } from "@/features/items/item-rules";
import { categories, itemGroups, items } from "@/features/items/sample-data";
import type { Invoice, InvoiceLine } from "./types";

const catalog = { categories, groups: itemGroups, items, hsnCodes };

/** An invoice line for a sample item at its selling price. */
export function lineFor(itemId: string, quantity: number, discountPct = 0, rate?: number): InvoiceLine {
  const item = items.find((candidate) => candidate.id === itemId)!;
  const defaults = resolveItemDefaults(catalog, item);
  return {
    itemId,
    description: item.name,
    hsn: defaults.hsn.value ?? "",
    quantity,
    unit: defaults.unit.value ?? "",
    rate: rate ?? item.sellingPrice,
    discountPct,
    gstRatePct: defaults.gstRatePct.value ?? 0,
  };
}

/** A made-up 64-character IRN, clearly not a real one. */
const sampleIrn = (n: number) => `${"5a3e".repeat(15)}${String(n).padStart(4, "0")}`;
const sampleEinvoice = (n: number, date: string) => ({ number: sampleIrn(n), date, details: { ackNo: `11262${String(n).padStart(10, "0")}` } });

export const invoices: Invoice[] = [
  {
    id: "exp-2627-0004",
    kind: "export",
    number: "EXP/2627/0004",
    date: "2026-10-21",
    status: "issued",
    partyId: "tashi-construction",
    exportRoute: "lut",
    lutArn: "AD1904260000002 (sample)",
    destinationCountry: "Bhutan",
    shipTo: { line1: "Site office, Babesa", city: "Thimphu", country: "Bhutan" },
    currency: "INR",
    vehicleNumber: "WB73E4821",
    lines: [lineFor("tmt-12", 4850, 3), lineFor("tmt-16", 2400, 3), lineFor("binding-wire", 8)],
    documents: {
      "e-invoice": sampleEinvoice(1, "2026-10-21"),
      "lorry-challan": { number: "RTL/1187", date: "2026-10-21", details: { transporter: "Royal Transport Lines", vehicle: "WB73E4821", freight: "6500" } },
      "eway-bill": { number: "391000000001", date: "2026-10-21", details: { validUntil: "2026-10-22" } },
      "customs-invoice": { number: "CI/2627/0004", date: "2026-10-21", details: { fobValue: "476530" } },
      "packing-list": { number: "PL/2627/0004", date: "2026-10-21", details: { packages: "58", grossKg: "7480" } },
      "shipping-bill": { number: "4100001", date: "2026-10-22", details: { portCode: "INJIGB" } },
    },
  },
  {
    id: "exp-2627-0003",
    kind: "export",
    number: "EXP/2627/0003",
    date: "2026-10-09",
    status: "issued",
    partyId: "druk-builders",
    exportRoute: "igst",
    destinationCountry: "Bhutan",
    currency: "INR",
    vehicleNumber: "WB74F2210",
    lines: [lineFor("aac-200", 1200, 5), lineFor("aac-150", 600, 5)],
    documents: {
      "e-invoice": sampleEinvoice(2, "2026-10-09"),
      "lorry-challan": { number: "RTL/1142", date: "2026-10-09", details: { transporter: "Royal Transport Lines", vehicle: "WB74F2210", freight: "4800" } },
      "eway-bill": { number: "391000000002", date: "2026-10-09", details: { validUntil: "2026-10-10" } },
      "customs-invoice": { number: "CI/2627/0003", date: "2026-10-09", details: { fobValue: "136800" } },
      "packing-list": { number: "PL/2627/0003", date: "2026-10-09", details: { packages: "36", grossKg: "31680" } },
      "shipping-bill": { number: "4100002", date: "2026-10-10", details: { portCode: "INJIGB" } },
      leo: { number: "4100002", date: "2026-10-10", details: {} },
      brc: { number: "BRC-SAMPLE-0091", date: "2026-10-26", details: { amount: "161424", bank: "Sample Bank, Jaigaon" } },
    },
  },
  {
    id: "exp-2627-0005",
    kind: "export",
    number: "EXP/2627/0005",
    date: "2026-10-27",
    status: "draft",
    partyId: "tashi-construction",
    exportRoute: "lut",
    lutArn: "AD1904260000002 (sample)",
    destinationCountry: "Bhutan",
    currency: "INR",
    lines: [lineFor("ply-18", 40, 2), lineFor("chips-white-2b", 60)],
    documents: {},
  },
  {
    id: "inv-2627-0031",
    kind: "local",
    number: "INV/2627/0031",
    date: "2026-10-06",
    status: "issued",
    partyId: "siliguri-infra",
    placeOfSupply: "19",
    currency: "INR",
    vehicleNumber: "WB73D7712",
    lines: [lineFor("tmt-10", 1800, 2), lineFor("angle-50", 650), lineFor("nut-bolt", 400)],
    documents: {
      "e-invoice": sampleEinvoice(3, "2026-10-06"),
      "lorry-challan": { number: "RTL/1120", date: "2026-10-06", details: { transporter: "Royal Transport Lines", vehicle: "WB73D7712", freight: "3200" } },
      "eway-bill": { number: "391000000003", date: "2026-10-06", details: { validUntil: "2026-10-07" } },
    },
  },
  {
    id: "inv-2627-0058",
    kind: "local",
    number: "INV/2627/0058",
    date: "2026-10-24",
    status: "issued",
    partyId: "guwahati-hardware",
    placeOfSupply: "18",
    currency: "INR",
    lines: [lineFor("wire-nail", 30), lineFor("binding-wire", 12), lineFor("hdpe-63", 300)],
    documents: {},
  },
  {
    id: "inv-2627-0059",
    kind: "local",
    number: "INV/2627/0059",
    date: "2026-10-26",
    status: "issued",
    partyId: "walk-in",
    placeOfSupply: "19",
    currency: "INR",
    lines: [lineFor("dolomite", 4), lineFor("v-belt", 1)],
    documents: {},
  },
];

/** The next number in each series, for the new-invoice form. */
export const nextSequence = { local: 60, export: 6 };
