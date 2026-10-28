// Vendor bill arithmetic, status and landed cost. No React: the backend will
// port these when bills are saved for real.
//
// Which GST applies comes from gst-rules.ts (vendor treatment and source of
// supply). Freight and loading printed on a goods bill take the bill's own
// rate (27 Oct 2026 walkthrough). Under reverse charge we owe the vendor only
// the taxable value and pay the GST ourselves. GST we cannot claim back
// (composition, unregistered, Section 17(5)) is part of what the goods cost.
import { purchaseTax, taxComponents, type Regime, type TaxComponent, type TaxDecision } from "@/features/gst/gst-rules";
import { EWAY_BILL_LIMIT, lineTotals } from "@/features/invoices/invoice-rules";
import type { Item } from "@/features/items/types";
import { taxProfileOf } from "@/features/parties/party-rules";
import type { Party } from "@/features/parties/types";
import { addDays } from "@/lib/dates";
import type { Bill, BillCharge, BillLine, ChargeHead, LandedCostMethod } from "./types";

const money = (value: number) => Math.round(value * 100) / 100;

export const CHARGE_HEADS: { value: ChargeHead; label: string }[] = [
  { value: "freight", label: "Freight / transport" },
  { value: "loading", label: "Loading" },
  { value: "unloading", label: "Unloading" },
  { value: "labour", label: "Labour" },
  { value: "other", label: "Other charge" },
];

export const chargeHeadLabel = (head: ChargeHead) => CHARGE_HEADS.find((option) => option.value === head)?.label ?? head;

/** GST on freight by a goods transport agency under reverse charge. */
export const GTA_RCM_RATE = 5;

/** MSMED Act s.15: a micro or small vendor must be paid within 45 days. */
export const MSME_PAYMENT_DAYS = 45;

export const isMsme = (vendor: Pick<Party, "udyamNumber">) => Boolean(vendor.udyamNumber);

/** The tax decision for a bill: the vendor's treatment, from the bill's source of supply. */
export const billTax = (companyState: string, vendor: Party, sourceOfSupply?: string): TaxDecision =>
  purchaseTax(companyState, { ...taxProfileOf(vendor), stateCode: sourceOfSupply || vendor.placeOfSupply });

/** How the rate splits. Reverse charge is still CGST + SGST or IGST, only paid by us. */
export function splitRegime(decision: TaxDecision, companyState: string, sourceOfSupply?: string): Regime {
  if (decision.regime !== "reverse-charge") return decision.regime;
  return sourceOfSupply === companyState ? "intra-state" : "inter-state";
}

/**
 * The rate freight and loading on a goods bill follow: that of the line with
 * the largest value, the principal supply.
 */
export function billChargeRate(lines: BillLine[]): number {
  let principal: BillLine | undefined;
  for (const line of lines) {
    if (!principal || line.quantity * line.rate > principal.quantity * principal.rate) principal = line;
  }
  return principal?.gstRatePct ?? 0;
}

/**
 * What a charges bill's rate can be. Under reverse charge it is fixed at the
 * GTA rate; with no GST bill it is zero; otherwise it is read off the bill.
 */
export function chargeRateRule(decision: TaxDecision): { fixed?: number; options: number[] } {
  if (decision.regime === "reverse-charge") return { fixed: GTA_RCM_RATE, options: [GTA_RCM_RATE] };
  if (decision.regime === "no-gst") return { fixed: 0, options: [0] };
  return { options: [5, 12, 18] };
}

const chargeRate = (kind: Bill["kind"], charge: BillCharge, goodsRate: number) => (kind === "goods" ? goodsRate : (charge.gstRatePct ?? 0));

export interface BillTotals {
  goodsValue: number;
  chargesValue: number;
  taxable: number;
  taxByName: Partial<Record<TaxComponent["name"], number>>;
  tax: number;
  reverseCharge: boolean;
  /** Input tax credit we can claim. Under reverse charge, once we have paid it. */
  itcClaimable: number;
  /** GST paid that we cannot claim: it adds to cost. */
  itcLost: number;
  roundOff: number;
  /** What we owe the vendor. */
  payable: number;
  /** What the bill costs us: taxable value plus GST we cannot claim. */
  cost: number;
}

export function billTotals(bill: Pick<Bill, "kind" | "lines" | "charges">, decision: TaxDecision, split: Regime): BillTotals {
  const taxByName: BillTotals["taxByName"] = {};
  const add = (taxes: { name: TaxComponent["name"]; amount: number }[]) => {
    for (const tax of taxes) taxByName[tax.name] = money((taxByName[tax.name] ?? 0) + tax.amount);
  };
  const sum = (taxes: { amount: number }[]) => taxes.reduce((total, tax) => total + tax.amount, 0);

  let goodsValue = 0;
  let itcLost = 0;
  for (const line of bill.lines) {
    const totals = lineTotals(line, split);
    goodsValue += totals.taxable;
    add(totals.taxes);
    if (line.itc === "ineligible") itcLost += sum(totals.taxes);
  }

  let chargesValue = 0;
  const goodsRate = billChargeRate(bill.lines);
  for (const charge of bill.charges) {
    const taxable = money(charge.amount);
    const taxes = taxComponents(chargeRate(bill.kind, charge, goodsRate), split).map((component) => ({
      ...component,
      amount: money((taxable * component.ratePct) / 100),
    }));
    chargesValue += taxable;
    add(taxes);
  }

  const tax = money(Object.values(taxByName).reduce((total, amount) => total + (amount ?? 0), 0));
  if (decision.itc === false) itcLost = tax;
  const taxable = money(goodsValue + chargesValue);
  const reverseCharge = decision.regime === "reverse-charge";
  const exact = money(taxable + (reverseCharge ? 0 : tax));
  const payable = Math.round(exact);
  return {
    goodsValue: money(goodsValue),
    chargesValue: money(chargesValue),
    taxable,
    taxByName,
    tax,
    reverseCharge,
    itcClaimable: money(tax - itcLost),
    itcLost: money(itcLost),
    roundOff: money(payable - exact),
    payable,
    cost: money(taxable + itcLost),
  };
}

/** Due date from the vendor's credit days, capped at 45 days for MSME vendors. */
export function billDueDate(date: string, vendor: Pick<Party, "creditDays" | "udyamNumber">) {
  return addDays(date, isMsme(vendor) ? Math.min(vendor.creditDays, MSME_PAYMENT_DAYS) : vendor.creditDays);
}

export type BillStatus = "Draft" | "Open" | "Overdue" | "Partially paid" | "Paid" | "Void";

/** Zoho's bill statuses. Overdue needs today's date, which only the browser knows. */
export function billStatus(bill: Pick<Bill, "status" | "paid" | "dueDate">, payable: number, today: string | null): BillStatus {
  if (bill.status === "void") return "Void";
  if (bill.status === "draft") return "Draft";
  if (bill.paid >= payable) return "Paid";
  if (today && today > bill.dueDate) return "Overdue";
  return bill.paid > 0 ? "Partially paid" : "Open";
}

/** Our series for every bill, goods or charges: PUR/2627/0014. */
export function purchaseReference(financialYear: string, sequence: number) {
  return `PUR/${financialYear.replace("-", "").slice(2)}/${String(sequence).padStart(4, "0")}`;
}

/**
 * On a purchase the vendor generates the e-way bill; we only record it. A
 * goods bill above the limit without one recorded is worth a reminder.
 */
export const ewayBillMissing = (bill: Pick<Bill, "kind" | "ewayBill">, payable: number) =>
  bill.kind === "goods" && payable > EWAY_BILL_LIMIT && !bill.ewayBill;

/** Charges bills tagged to this goods bill. */
export const chargeBillsFor = (bills: Bill[], billId: string) =>
  bills.filter((bill) => bill.kind === "charges" && bill.landedCostFor === billId && bill.status !== "void");

/** Kilograms on a line: from a kg or ton unit, else from the item's weight per unit. */
export function lineWeightKg(line: Pick<BillLine, "quantity" | "unit">, item?: Pick<Item, "weightKg">): number | undefined {
  if (line.unit === "kg") return line.quantity;
  if (line.unit === "ton") return line.quantity * 1000;
  return item?.weightKg === undefined ? undefined : line.quantity * item.weightKg;
}

export interface LandedCostRow {
  line: BillLine;
  /** The line's value, quantity or weight, by method. */
  basis: number;
  /** Taxable value plus GST that cannot be claimed. */
  ownCost: number;
  share: number;
  landedCost: number;
  /** Per unit, the figure stock is valued at. */
  landedRate: number;
}

/**
 * Spreads `charges` over the lines in proportion to value, quantity or
 * weight. The last line takes the rounding remainder so the shares add up.
 * Null when weight is asked for and a line's weight is unknown.
 */
export function allocateLandedCost(
  lines: BillLine[],
  split: Regime,
  charges: number,
  method: LandedCostMethod,
  weightOf: (line: BillLine) => number | undefined,
): LandedCostRow[] | null {
  const rows = lines.map((line) => {
    const totals = lineTotals(line, split);
    const ownCost = money(totals.taxable + (line.itc === "ineligible" ? totals.taxes.reduce((sum, tax) => sum + tax.amount, 0) : 0));
    const basis = method === "value" ? totals.taxable : method === "quantity" ? line.quantity : weightOf(line);
    return { line, basis, ownCost };
  });
  if (rows.some((row) => row.basis === undefined)) return null;

  const totalBasis = rows.reduce((sum, row) => sum + (row.basis ?? 0), 0);
  let given = 0;
  return rows.map((row, index) => {
    const basis = row.basis ?? 0;
    const share = index === rows.length - 1 ? money(charges - given) : totalBasis ? money((charges * basis) / totalBasis) : 0;
    given = money(given + share);
    const landedCost = money(row.ownCost + share);
    return { ...row, basis, share, landedCost, landedRate: row.line.quantity ? money(landedCost / row.line.quantity) : 0 };
  });
}

export const LANDED_COST_METHODS: { value: LandedCostMethod; label: string; hint: string }[] = [
  { value: "value", label: "By value", hint: "Dearer lines carry more. Zoho's default" },
  { value: "quantity", label: "By quantity", hint: "Only fair when every line is in the same unit" },
  { value: "weight", label: "By weight", hint: "Suits freight on a truck load: kg from the unit or the item's weight" },
];
