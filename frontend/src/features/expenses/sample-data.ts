// SAMPLE DATA for expenses: invented payments against the sample heads,
// invoices, shipments and bills.
import type { Expense } from "./types";

export const expenses: Expense[] = [
  { id: "expn-0041", number: "EXPN/2627/0041", date: "2026-10-09", headId: "customs-agent", description: "Clearing SHP/2627/0004", amount: 3500, gstRatePct: 18, payee: "Border Clearing Agency (sample)", paidFrom: "sbi-current", reference: "BCA/552", allocation: { kind: "shipment", targetId: "shp-2627-0004" } },
  { id: "expn-0042", number: "EXPN/2627/0042", date: "2026-10-10", headId: "border-charges", description: "LCS parking and weighbridge", amount: 850, gstRatePct: 0, payee: "Jaigaon LCS counter", paidFrom: "cash", allocation: { kind: "shipment", targetId: "shp-2627-0004" } },
  { id: "expn-0043", number: "EXPN/2627/0043", date: "2026-10-09", headId: "freight-outward", description: "Truck to Phuentsholing", amount: 4800, gstRatePct: 5, vendorId: "royal-transport", paidFrom: "sbi-current", reference: "RTL/1142", allocation: { kind: "shipment", targetId: "shp-2627-0004" } },
  { id: "expn-0044", number: "EXPN/2627/0044", date: "2026-10-06", headId: "loading", description: "Loading for Siliguri Infra", amount: 1200, gstRatePct: 0, vendorId: "jaigaon-loaders", paidFrom: "cash", allocation: { kind: "invoice", targetId: "inv-2627-0031" } },
  { id: "expn-0045", number: "EXPN/2627/0045", date: "2026-10-21", headId: "freight-outward", description: "Truck to Thimphu", amount: 6500, gstRatePct: 5, vendorId: "royal-transport", reference: "RTL/1187", allocation: { kind: "shipment", targetId: "shp-2627-0005" } },
  { id: "expn-0046", number: "EXPN/2627/0046", date: "2026-10-22", headId: "customs-agent", description: "Clearing SHP/2627/0005", amount: 3500, gstRatePct: 18, payee: "Border Clearing Agency (sample)", paidFrom: "sbi-current", reference: "BCA/571", allocation: { kind: "shipment", targetId: "shp-2627-0005" } },
  { id: "expn-0047", number: "EXPN/2627/0047", date: "2026-10-01", headId: "rent", description: "Yard rent, October", amount: 18000, gstRatePct: 18, payee: "Yard owner (sample)", paidFrom: "sbi-current", allocation: { kind: "overhead" } },
  { id: "expn-0048", number: "EXPN/2627/0048", date: "2026-10-05", headId: "salary", description: "Staff salary, September", amount: 64000, gstRatePct: 0, payee: "Staff", paidFrom: "sbi-current", allocation: { kind: "overhead" } },
  { id: "expn-0049", number: "EXPN/2627/0049", date: "2026-10-14", headId: "office", description: "Keyboard and printer toner", amount: 2350, gstRatePct: 18, payee: "Computer shop (sample)", paidFrom: "cash", allocation: { kind: "overhead" } },
  { id: "expn-0050", number: "EXPN/2627/0050", date: "2026-10-18", headId: "bank-charges", description: "Inward remittance charges", amount: 590, gstRatePct: 18, payee: "SBI", paidFrom: "sbi-current", allocation: { kind: "overhead" } },
  { id: "expn-0051", number: "EXPN/2627/0051", date: "2026-10-16", headId: "labour", description: "Unloading bricks at yard", amount: 1600, gstRatePct: 0, vendorId: "jaigaon-loaders", paidFrom: "cash", allocation: { kind: "item-cost", targetId: "pur-2627-0015" } },
];

export const nextExpenseSequence = 58;
