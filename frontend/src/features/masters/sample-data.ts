// SAMPLE DATA for the smaller masters. Brand names are from the brochure;
// bank accounts, transporters, vehicles and phone numbers are invented.
import type { Brand, ExpenseHead, Godown, MoneyAccount, NumberSeries, Transporter, Unit, Vehicle } from "./types";

export const brands: Brand[] = [
  { id: "hind-tmt", name: "Hind TMT", categoryId: "iron-steel", authorised: true, notes: "Hind Steel, Durgapur" },
  { id: "swastik", name: "Swastik", categoryId: "iron-steel", authorised: true, notes: "Castings and manhole covers" },
  { id: "isi", name: "ISI", categoryId: "iron-steel", authorised: false, notes: "Unbranded, ISI-marked sections and rods" },
  { id: "asian-paints", name: "Asian Paints", categoryId: "paints", authorised: true },
  { id: "bosch", name: "Bosch", categoryId: "hardware-plywood", authorised: true, notes: "Power tools" },
  { id: "century-ply", name: "Century Ply", categoryId: "hardware-plywood", authorised: false, archived: true },
];

export const units: Unit[] = [
  { id: "kg", symbol: "kg", name: "Kilogram", kind: "weight", decimals: 3, uqc: "KGS" },
  { id: "ton", symbol: "ton", name: "Metric ton", kind: "weight", decimals: 3, uqc: "MTS" },
  { id: "pcs", symbol: "pcs", name: "Pieces", kind: "count", decimals: 0, uqc: "PCS" },
  { id: "bag", symbol: "bag", name: "Bag", kind: "count", decimals: 0, uqc: "BAG" },
  { id: "bundle", symbol: "bundle", name: "Bundle", kind: "count", decimals: 0, uqc: "BDL" },
  { id: "sheet", symbol: "sheet", name: "Sheet", kind: "count", decimals: 0, uqc: "PCS" },
  { id: "box", symbol: "box", name: "Box", kind: "count", decimals: 0, uqc: "BOX" },
  { id: "thousand", symbol: "thousand", name: "Thousand (bricks)", kind: "count", decimals: 2, uqc: "THD" },
  { id: "cbm", symbol: "CBM", name: "Cubic metre", kind: "volume", decimals: 3, uqc: "CBM" },
  { id: "cft", symbol: "cft", name: "Cubic foot", kind: "volume", decimals: 2, uqc: "CFT" },
  { id: "sqft", symbol: "sq ft", name: "Square foot", kind: "area", decimals: 2, uqc: "SQF" },
  { id: "m", symbol: "m", name: "Metre", kind: "length", decimals: 2, uqc: "MTR" },
  { id: "l", symbol: "L", name: "Litre", kind: "volume", decimals: 2, uqc: "LTR" },
];

export const godowns: Godown[] = [
  { id: "mg-road-store", name: "M.G. Road store", address: "M.G. Road, Jaigaon 736182", kind: "store", isDefault: true, inCharge: "Store keeper", phone: "+919800000101" },
  { id: "nh-yard", name: "NH 31C yard", address: "Near Jaigaon LCS, NH 31C", kind: "yard", isDefault: false, inCharge: "Yard supervisor", phone: "+919800000102" },
];

export const moneyAccounts: MoneyAccount[] = [
  { id: "sbi-current", name: "SBI current account", kind: "bank", bankName: "State Bank of India (sample)", accountNumber: "00000000000101", ifsc: "SBIN0000001", branch: "Jaigaon", openingBalance: 450000, balance: 1286400, onInvoice: true },
  { id: "hdfc-od", name: "HDFC OD account", kind: "bank", bankName: "HDFC Bank (sample)", accountNumber: "00000000000202", ifsc: "HDFC0000002", branch: "Siliguri", openingBalance: -150000, balance: -312000, onInvoice: false },
  { id: "cash", name: "Cash in hand", kind: "cash", openingBalance: 25000, balance: 41850, onInvoice: false },
];

export const transporters: Transporter[] = [
  { id: "royal-transport", name: "Royal Transport Lines", transporterId: "19ZZRTL0007G1ZH", phone: "+919800000010", isGta: true, vendorId: "royal-transport", notes: "Siliguri and Durgapur runs" },
  { id: "dooars-carriers", name: "Dooars Carriers", transporterId: "19ZZDCR0011K1Z2", phone: "+919800000013", isGta: true, notes: "Local runs to the border" },
  { id: "bhutan-freight", name: "Phuentsholing Freight (Bhutan)", transporterId: "88AAAPF0000A1Z0", phone: "+97517000001", isGta: false, notes: "Bhutan-side carrier after the border" },
];

export const vehicles: Vehicle[] = [
  { id: "wb73d2051", number: "WB73D2051", type: "truck-10", capacityTons: 16, ownership: "hired", transporterId: "royal-transport", driverName: "Driver 1", driverPhone: "+919800000201" },
  { id: "wb37c4410", number: "WB37C4410", type: "trailer", capacityTons: 25, ownership: "hired", transporterId: "royal-transport", driverName: "Driver 2", driverPhone: "+919800000202" },
  { id: "wb73e1234", number: "WB73E1234", type: "truck-6", capacityTons: 9, ownership: "own", driverName: "Driver 3", driverPhone: "+919800000203" },
  { id: "wb74p0088", number: "WB74P0088", type: "pickup", capacityTons: 1.5, ownership: "own", driverName: "Driver 4", driverPhone: "+919800000204" },
];

export const numberSeries: NumberSeries[] = [
  { id: "quotation", document: "quotation", prefix: "QT/2627/", financialYear: "2026-27", nextNumber: 47, padding: 4 },
  { id: "invoice", document: "invoice", prefix: "INV/2627/", financialYear: "2026-27", nextNumber: 9, padding: 4 },
  { id: "export-invoice", document: "export-invoice", prefix: "EXP/2627/", financialYear: "2026-27", nextNumber: 5, padding: 4 },
  { id: "bill", document: "bill", prefix: "PUR/2627/", financialYear: "2026-27", nextNumber: 20, padding: 4 },
  { id: "receipt", document: "receipt", prefix: "RCT/2627/", financialYear: "2026-27", nextNumber: 31, padding: 4 },
  { id: "payment", document: "payment", prefix: "PAY/2627/", financialYear: "2026-27", nextNumber: 24, padding: 4 },
  { id: "shipment", document: "shipment", prefix: "SHP/2627/", financialYear: "2026-27", nextNumber: 6, padding: 4 },
  { id: "expense", document: "expense", prefix: "EXPN/2627/", financialYear: "2026-27", nextNumber: 58, padding: 4 },
  { id: "credit-note", document: "credit-note", prefix: "CN/2627/", financialYear: "2026-27", nextNumber: 2, padding: 4 },
  { id: "debit-note", document: "debit-note", prefix: "DN/2627/", financialYear: "2026-27", nextNumber: 1, padding: 4 },
  { id: "stock-journal", document: "stock-journal", prefix: "SJ/2627/", financialYear: "2026-27", nextNumber: 4, padding: 4 },
];

export const expenseHeads: ExpenseHead[] = [
  { id: "freight-inward", name: "Freight inward", kind: "direct", gst: "follows-bill", allocation: "item-cost", notes: "Transport of purchased goods to our yard" },
  { id: "unloading", name: "Unloading charges", kind: "direct", gst: "none", allocation: "item-cost" },
  { id: "loading", name: "Loading charges", kind: "direct", gst: "none", allocation: "invoice" },
  { id: "labour", name: "Labour", kind: "direct", gst: "none", allocation: "item-cost", notes: "Stacking, sorting, cutting" },
  { id: "freight-outward", name: "Freight outward", kind: "direct", gst: "own-rate", gstRatePct: 5, allocation: "shipment" },
  { id: "customs-agent", name: "Customs agent (CHA) fee", kind: "direct", gst: "own-rate", gstRatePct: 18, allocation: "shipment" },
  { id: "border-charges", name: "Border and LCS charges", kind: "direct", gst: "none", allocation: "shipment" },
  { id: "bank-charges", name: "Bank charges", kind: "indirect", gst: "own-rate", gstRatePct: 18, allocation: "overhead" },
  { id: "rent", name: "Rent", kind: "indirect", gst: "own-rate", gstRatePct: 18, allocation: "overhead" },
  { id: "salary", name: "Salary", kind: "indirect", gst: "none", allocation: "overhead" },
  { id: "repairs", name: "Repairs and maintenance", kind: "indirect", gst: "own-rate", gstRatePct: 18, allocation: "overhead" },
  { id: "office", name: "Office expenses", kind: "indirect", gst: "own-rate", gstRatePct: 18, allocation: "overhead", notes: "Stationery, keyboards, small equipment" },
];
