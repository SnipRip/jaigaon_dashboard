// Receipts and payments on the backend: paths, labels, save calls, and the
// rules the screens share (apply oldest first, MSME days left, a party's
// statement). The backend checks everything again on save.
import { apiRequest } from "@/lib/api-client";
import { daysBetween } from "@/lib/dates";
import type { AgeBucketView, OpenDocumentView, PaymentModeView, SettlementDirectionView, SettlementTargetView, SettlementView } from "@/types/settlement";

export const SETTLEMENTS_PATH = "/settlements";
export const documentsPath = (direction: SettlementDirectionView, partyId?: string) =>
  `${SETTLEMENTS_PATH}/documents?direction=${direction}${partyId ? `&partyId=${partyId}` : ""}`;
export const numberPreviewPath = (direction: SettlementDirectionView, date: string) => `/number-series/preview?kind=${direction}&date=${date}`;

export const MODE_OPTIONS: { value: PaymentModeView; label: string }[] = [
  { value: "BANK_TRANSFER", label: "Bank transfer (NEFT / RTGS)" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "UPI", label: "UPI" },
  { value: "CASH", label: "Cash" },
];
export const modeText = (mode: PaymentModeView) => MODE_OPTIONS.find((option) => option.value === mode)?.label ?? mode;

export const AGE_TEXT: Record<AgeBucketView, string> = {
  NOT_DUE: "Not due",
  DAYS_1_30: "1–30 days",
  DAYS_31_60: "31–60 days",
  DAYS_61_90: "61–90 days",
  OVER_90: "Over 90 days",
};
export const AGE_ORDER = Object.keys(AGE_TEXT) as AgeBucketView[];

/** Cash of ₹2 lakh or more from one person in a day is barred (Income-tax Act s.269ST). */
export const CASH_RECEIPT_LIMIT = 200000;

const money = (value: number) => Math.round(value * 100) / 100;

/** Where an invoice, bill or opening balance opens in the app. */
export const documentHref = (document: Pick<OpenDocumentView, "kind" | "id" | "partyId">) =>
  document.kind === "INVOICE" ? `/invoices/${document.id}` : document.kind === "BILL" ? `/purchases/${document.id}` : `/payments/ledger/${document.partyId}`;

/** Days left before an MSME bill passes its 45-day limit (negative once late). */
export const msmeDaysLeft = (document: Pick<OpenDocumentView, "dueDate">, today: string) => (document.dueDate ? daysBetween(today, document.dueDate) : 0);

/** Pick documents oldest first (the opening balance before any) until the amount runs out, as Zoho's "auto-apply" does. */
export function applyOldestFirst(amount: number, open: OpenDocumentView[]) {
  let left = money(amount);
  const plan = new Map<string, number>();
  for (const document of [...open].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))) {
    const applied = money(Math.min(left, document.balance));
    if (applied > 0) plan.set(document.id, applied);
    left = money(left - applied);
  }
  return plan;
}

export interface StatementRow {
  date: string;
  description: string;
  href?: string;
  /** Raises what the party owes us (invoice) or what we owe them (bill). */
  charge: number;
  /** Money (and TDS) that settles it. */
  settle: number;
  balance: number;
}

/** A party's statement in one direction: opening balance, documents and live settlements by date, with a running balance. */
export function statementRows(opening: number, documents: OpenDocumentView[], settlements: SettlementView[]): StatementRow[] {
  const entries = [
    ...documents
      .filter((document) => document.kind !== "OPENING" && document.date)
      .map((document) => ({ date: document.date!, description: document.number, href: documentHref(document), charge: document.total, settle: 0 })),
    ...settlements
      .filter((settlement) => !settlement.cancelledAt)
      .map((settlement) => ({
        date: settlement.date,
        description: `${settlement.number} · ${modeText(settlement.mode)}${settlement.reference ? ` ${settlement.reference}` : ""}${settlement.tds ? ` (TDS ${settlement.tds.toFixed(2)})` : ""}`,
        href: `/payments/entries/${settlement.id}`,
        charge: 0,
        settle: money(settlement.amount + settlement.tds),
      })),
  ].sort((a, b) => a.date.localeCompare(b.date) || b.charge - a.charge);
  let balance = opening;
  return entries.map((entry) => {
    balance = money(balance + entry.charge - entry.settle);
    return { ...entry, balance };
  });
}

export interface AllocationBody {
  kind: SettlementTargetView;
  documentId: string;
  amount: number;
}

export interface SettlementBody {
  direction: SettlementDirectionView;
  partyId: string;
  date: string;
  accountId: string;
  mode: PaymentModeView;
  amount: number;
  tds: number;
  reference: string | null;
  brcNumber: string | null;
  brcDate: string | null;
  notes: string | null;
  allocations: AllocationBody[];
}

export const createSettlement = (body: SettlementBody) => apiRequest<SettlementView>(SETTLEMENTS_PATH, { method: "POST", body });
export const applyAdvance = (id: string, allocations: AllocationBody[]) =>
  apiRequest<SettlementView>(`${SETTLEMENTS_PATH}/${id}/allocations`, { method: "POST", body: { allocations } });
export const cancelSettlement = (id: string, reason: string) =>
  apiRequest<SettlementView>(`${SETTLEMENTS_PATH}/${id}/cancel`, { method: "POST", body: { reason } });
