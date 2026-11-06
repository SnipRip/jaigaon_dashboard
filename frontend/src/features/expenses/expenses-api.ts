// Expenses on the backend: paths, allocation names between the two sides,
// the live GST preview (the backend works it out again on save, from the
// same rules: backend/src/expenses/expense-rules.ts), save and cancel.
import type { Party } from "@/features/parties/types";
import { billTax, chargeRateRule } from "@/features/purchases/purchase-rules";
import type { AccountHead, HeadAllocation } from "@/features/masters/types";
import { apiRequest } from "@/lib/api-client";
import type { ExpenseAllocationView, ExpenseView } from "@/types/expense";
import type { PaymentModeView } from "@/types/settlement";
import type { TaxDecision } from "@/features/gst/gst-rules";

export const EXPENSES_PATH = "/expenses";
export const expensePath = (id: string) => `${EXPENSES_PATH}/${id}`;
export const expenseNumberPreviewPath = (date: string) => `/number-series/preview?kind=EXPENSE&date=${date}`;

export const TO_BACKEND: Record<HeadAllocation, ExpenseAllocationView> = { "item-cost": "ITEM_COST", invoice: "INVOICE", shipment: "SHIPMENT", overhead: "OVERHEAD" };
export const FROM_BACKEND: Record<ExpenseAllocationView, HeadAllocation> = { ITEM_COST: "item-cost", INVOICE: "invoice", SHIPMENT: "shipment", OVERHEAD: "overhead" };

/** Where the cost's target opens in the app. */
export const targetHref = (target: NonNullable<ExpenseView["target"]>) => (target.kind === "BILL" ? `/purchases/${target.id}` : `/invoices/${target.id}`);

const money = (value: number) => Math.round(value * 100) / 100;

/** A payee known only by name: a GST bill is taken as from our own state. */
const PAYEE_DECISION: Record<"bill" | "none", TaxDecision> = {
  bill: { regime: "intra-state", title: "CGST + SGST", detail: "A GST bill from a local payee", itc: true },
  none: { regime: "no-gst", title: "No GST", detail: "No GST bill", itc: false },
};

/** The tax decision: the vendor's treatment (as on a bill), else the payee's GST bill or none. */
export const expenseDecision = (companyState: string | undefined, vendor: Party | undefined, gstBill: boolean): TaxDecision =>
  vendor && companyState ? billTax(companyState, vendor) : PAYEE_DECISION[gstBill ? "bill" : "none"];

/** Why the vendor's bill does not go through Expenses (the backend refuses the same). */
export const decisionProblem = (decision: TaxDecision) =>
  decision.regime === "reverse-charge"
    ? "A goods transport agency bills under reverse charge: enter it as a freight bill in Purchases."
    : decision.regime === "import"
      ? "A bill from an overseas or SEZ vendor goes through Purchases."
      : null;

export interface ExpensePreview {
  /** A fixed rate (head or vendor decides), else the rates to pick from. */
  rule: ReturnType<typeof chargeRateRule>;
  rate: number;
  cgst: number;
  sgst: number;
  igst: number;
  tax: number;
  claimable: boolean;
  total: number;
  cost: number;
}

export function expensePreview(amount: number, decision: TaxDecision, head: AccountHead | undefined, printedRate: number, itcEligible: boolean): ExpensePreview {
  const rule = chargeRateRule(decision, head);
  const rate = rule.fixed ?? printedRate;
  const inter = decision.regime === "inter-state";
  const tax = rate > 0 ? money((amount * rate) / 100) : 0;
  const half = inter ? 0 : money((amount * rate) / 2 / 100);
  const parts = rate > 0 ? { cgst: half, sgst: half, igst: inter ? tax : 0 } : { cgst: 0, sgst: 0, igst: 0 };
  const total = money(parts.cgst + parts.sgst + parts.igst);
  const claimable = total === 0 || (Boolean(decision.itc) && itcEligible);
  return { rule, rate, ...parts, tax: total, claimable, total: money(amount + total), cost: claimable ? money(amount) : money(amount + total) };
}

export interface ExpenseBody {
  date: string;
  headId: string;
  description: string;
  amount: number;
  gstRatePct: number;
  gstBill: boolean;
  itcEligible: boolean;
  vendorId: string | null;
  payee: string | null;
  accountId: string | null;
  mode: PaymentModeView | null;
  allocation: ExpenseAllocationView;
  targetId: string | null;
  reference: string | null;
  notes: string | null;
}

export const createExpense = (body: ExpenseBody) => apiRequest<ExpenseView>(EXPENSES_PATH, { method: "POST", body });
export const cancelExpense = (id: string, reason: string) => apiRequest<ExpenseView>(`${expensePath(id)}/cancel`, { method: "POST", body: { reason } });
