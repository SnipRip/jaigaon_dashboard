// SAMPLE DATA for the smaller masters. Brand names are from the brochure;
// bank accounts, vehicles and phone numbers are invented. The sample
// vehicles stay only for global search (still sample).
// Bank & cash is real since 3 Nov 2026: `moneyAccounts` is no longer shown
// there, but the sample expense and payment screens still read it.
import type { Brand, Godown, MoneyAccount, Unit, Vehicle } from "./types";

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
  { id: "sbi-current", name: "SBI current account", kind: "bank", bankName: "State Bank of India (sample)", accountNumber: "00000000000101", ifsc: "SBIN0000001", branch: "Jaigaon", openingBalance: 450000, openingDate: "2026-04-01", showOnInvoice: true },
  { id: "hdfc-od", name: "HDFC OD account", kind: "overdraft", bankName: "HDFC Bank (sample)", accountNumber: "00000000000202", ifsc: "HDFC0000002", branch: "Siliguri", openingBalance: -150000, openingDate: "2026-04-01", showOnInvoice: false },
  { id: "cash", name: "Cash in hand", kind: "cash", openingBalance: 25000, openingDate: "2026-04-01", showOnInvoice: false },
];

export const vehicles: Vehicle[] = [
  { id: "wb73d2051", number: "WB73D2051", type: "truck-10", capacityTons: 16, ownership: "hired", transporterId: "royal-transport", driverName: "Driver 1", driverPhone: "+919800000201" },
  { id: "wb37c4410", number: "WB37C4410", type: "trailer", capacityTons: 25, ownership: "hired", transporterId: "royal-transport", driverName: "Driver 2", driverPhone: "+919800000202" },
  { id: "wb73e1234", number: "WB73E1234", type: "truck-6", capacityTons: 9, ownership: "own", driverName: "Driver 3", driverPhone: "+919800000203" },
  { id: "wb74p0088", number: "WB74P0088", type: "pickup", capacityTons: 1.5, ownership: "own", driverName: "Driver 4", driverPhone: "+919800000204" },
];
