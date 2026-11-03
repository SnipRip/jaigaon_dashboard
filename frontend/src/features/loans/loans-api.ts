// Loan calls, labels, and the conversion between the backend's loan and the
// record the loans list (RecordMaster) edits.
import type { StatusTone } from "@/components/ui/status-chip";
import type { Changes } from "@/features/masters/masters-api";
import { persistence } from "@/features/masters/masters-api";
import type { MasterRecord } from "@/features/masters/record-master";
import { apiRequest } from "@/lib/api-client";
import type {
  InstalmentStatus,
  InstalmentView,
  InterestFrequency,
  LoanDetailView,
  LoanDirection,
  LoanDisbursal,
  LoanEntryKind,
  LoanKind,
  LoanRepayment,
  LoanView,
} from "@/types/loan";

export const LOANS_PATH = "/loans";
export const LOAN_REMINDERS_PATH = "/loans/reminders";
export const loanPath = (id: string) => `${LOANS_PATH}/${id}`;
export const loanHref = (id: string) => `/loans/${id}`;

export const DIRECTIONS: { value: LoanDirection; label: string }[] = [
  { value: "TAKEN", label: "We borrowed (we owe it)" },
  { value: "GIVEN", label: "We lent or deposited (owed to us)" },
];

// Kinds per direction (the backend's KINDS_BY_DIRECTION holds the same).
export const TAKEN_KINDS: { value: LoanKind; label: string }[] = [
  { value: "VEHICLE", label: "Vehicle loan" },
  { value: "EQUIPMENT", label: "Machinery / equipment loan" },
  { value: "PROPERTY", label: "Property loan" },
  { value: "BUSINESS", label: "Business / working-capital loan" },
  { value: "GOLD", label: "Gold loan" },
  { value: "OWNER", label: "From owners, directors or relatives" },
  { value: "OTHER", label: "Other loan" },
];
export const GIVEN_KINDS: { value: LoanKind; label: string }[] = [
  { value: "BUSINESS", label: "Loan to a business or person" },
  { value: "STAFF", label: "Staff salary advance" },
  { value: "DEPOSIT", label: "Security deposit (rent, electricity, tender)" },
  { value: "OTHER", label: "Other advance" },
];

export const REPAYMENTS: { value: LoanRepayment; label: string }[] = [
  { value: "EMI", label: "Fixed EMI" },
  { value: "FLEXIBLE", label: "No EMI: interest on its dates, principal any time" },
];

/** "NONE" stands for an interest-free loan; it goes to the backend as null. */
export const FREQUENCIES: { value: InterestFrequency | "NONE"; label: string }[] = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "HALF_YEARLY", label: "Half-yearly" },
  { value: "YEARLY", label: "Yearly" },
  { value: "AT_MATURITY", label: "Once, at the repay-by date" },
  { value: "NONE", label: "No interest" },
];

export const DISBURSALS: { value: LoanDisbursal; label: string }[] = [
  { value: "THROUGH_BANK", label: "Through our bank" },
  { value: "PAID_TO_SELLER", label: "Paid to the seller of an asset (loans we take)" },
  { value: "BEFORE_BOOKS", label: "Already running before these books" },
];

export const INSTALMENT_STATUS: Record<InstalmentStatus, { tone: StatusTone; label: string }> = {
  PAID_BEFORE_BOOKS: { tone: "neutral", label: "Paid before" },
  PAID: { tone: "success", label: "Settled" },
  OVERDUE: { tone: "danger", label: "Overdue" },
  DUE_SOON: { tone: "warning", label: "Due soon" },
  UPCOMING: { tone: "neutral", label: "Upcoming" },
};

export const kindLabel = (direction: LoanDirection, kind: LoanKind) =>
  (direction === "TAKEN" ? TAKEN_KINDS : GIVEN_KINDS).find((option) => option.value === kind)?.label ?? kind;

export const frequencyLabel = (frequency: InterestFrequency | null) =>
  FREQUENCIES.find((option) => option.value === (frequency ?? "NONE"))?.label ?? "";

/** What a schedule row is, in words. */
export const rowLabel = (direction: LoanDirection, row: Pick<InstalmentView, "kind" | "no">) =>
  row.kind === "EMI" ? `EMI ${row.no}` : row.kind === "INTEREST" ? "Interest" : direction === "TAKEN" ? "Repay by" : "Due back";

const ENTRY_LABELS: Record<LoanDirection, Record<LoanEntryKind, string>> = {
  TAKEN: {
    EMI: "EMI paid",
    PRINCIPAL: "Principal repaid",
    INTEREST: "Interest paid",
    INTEREST_ADDED: "Interest added to the loan",
    DRAWDOWN: "More borrowed",
  },
  GIVEN: {
    EMI: "EMI received",
    PRINCIPAL: "Principal received back",
    INTEREST: "Interest received",
    INTEREST_ADDED: "Interest added to the loan",
    DRAWDOWN: "More lent",
  },
};
export const entryLabel = (direction: LoanDirection, kind: LoanEntryKind) => ENTRY_LABELS[direction][kind];

/** Which voucher an entry makes (the backend's voucherTypeOf), and the series it is numbered from. */
export function voucherOf(direction: LoanDirection, kind: LoanEntryKind): { type: string; series: string } {
  if (kind === "INTEREST_ADDED") return { type: "Journal", series: "Journal" };
  const moneyOut = kind === "DRAWDOWN" ? direction === "GIVEN" : direction === "TAKEN";
  return moneyOut ? { type: "Payment", series: "Payment" } : { type: "Receipt", series: "Receipt" };
}

/** A loan as the list edits it: blanks undefined, the kind split by direction. */
export interface LoanRecord extends MasterRecord {
  view: LoanView;
  name: string;
  direction: LoanDirection;
  takenKind?: LoanKind;
  givenKind?: LoanKind;
  repayment: LoanRepayment;
  partyName: string;
  loanAccountNumber?: string;
  isSecured: boolean;
  security?: string;
  principal: number;
  interestRatePct: number;
  disbursedOn: string;
  disbursal: LoanDisbursal;
  disbursalAccountId?: string;
  assetLedgerName?: string;
  paidBefore?: number;
  openingOutstanding?: number;
  tenureMonths?: number;
  emiAmount?: number;
  firstEmiDate?: string;
  interestFrequency?: InterestFrequency | "NONE";
  firstInterestDate?: string;
  maturityDate?: string;
  repaymentAccountId: string;
  interestLedgerName?: string;
  tdsRatePct?: number;
  tdsLedgerName?: string;
  reminderDays: number;
  notes?: string;
}

const orUndefined = <T>(value: T | null) => value ?? undefined;

export const toLoanRecord = (loan: LoanView): LoanRecord => ({
  id: loan.id,
  archived: loan.isArchived,
  view: loan,
  name: loan.name,
  direction: loan.direction,
  takenKind: loan.direction === "TAKEN" ? loan.kind : undefined,
  givenKind: loan.direction === "GIVEN" ? loan.kind : undefined,
  repayment: loan.repayment,
  partyName: loan.partyName,
  loanAccountNumber: orUndefined(loan.loanAccountNumber),
  isSecured: loan.isSecured,
  security: orUndefined(loan.security),
  principal: loan.principal,
  interestRatePct: loan.interestRatePct,
  disbursedOn: loan.disbursedOn,
  disbursal: loan.disbursal,
  disbursalAccountId: orUndefined(loan.disbursalAccountId),
  assetLedgerName: orUndefined(loan.assetLedgerName),
  paidBefore: loan.disbursal === "BEFORE_BOOKS" && loan.repayment === "EMI" ? loan.paidBefore : undefined,
  openingOutstanding: orUndefined(loan.openingOutstanding),
  tenureMonths: orUndefined(loan.tenureMonths),
  emiAmount: orUndefined(loan.emiAmount),
  firstEmiDate: orUndefined(loan.firstEmiDate),
  interestFrequency: loan.repayment === "FLEXIBLE" ? (loan.interestFrequency ?? "NONE") : undefined,
  firstInterestDate: orUndefined(loan.firstInterestDate),
  maturityDate: orUndefined(loan.maturityDate),
  repaymentAccountId: loan.repaymentAccountId,
  interestLedgerName: orUndefined(loan.interestLedgerName),
  tdsRatePct: orUndefined(loan.tdsRatePct),
  tdsLedgerName: orUndefined(loan.tdsLedgerName),
  reminderDays: loan.reminderDays,
  notes: orUndefined(loan.notes),
});

// Form values → request body. Fields hidden for the chosen direction,
// repayment or disbursal arrive blank and go as null; a blank EMI is worked
// out by the backend.
const loanBody = (changes: Changes) => {
  const frequency = changes.interestFrequency === "NONE" ? null : (changes.interestFrequency ?? null);
  return {
    name: changes.name,
    direction: changes.direction,
    kind: changes.direction === "TAKEN" ? changes.takenKind : changes.givenKind,
    repayment: changes.repayment,
    partyName: changes.partyName,
    loanAccountNumber: changes.loanAccountNumber ?? null,
    isSecured: Boolean(changes.isSecured),
    security: changes.isSecured ? (changes.security ?? null) : null,
    principal: changes.principal,
    interestRatePct: changes.interestRatePct ?? 0,
    disbursedOn: changes.disbursedOn,
    disbursal: changes.disbursal,
    disbursalAccountId: changes.disbursalAccountId ?? null,
    assetLedgerName: changes.assetLedgerName ?? null,
    paidBefore: changes.paidBefore ?? 0,
    openingOutstanding: changes.openingOutstanding ?? null,
    tenureMonths: changes.tenureMonths ?? null,
    emiAmount: changes.emiAmount ?? null,
    firstEmiDate: changes.firstEmiDate ?? null,
    interestFrequency: frequency,
    firstInterestDate: frequency && frequency !== "AT_MATURITY" ? (changes.firstInterestDate ?? null) : null,
    maturityDate: changes.maturityDate ?? null,
    repaymentAccountId: changes.repaymentAccountId,
    interestLedgerName: changes.interestLedgerName ?? null,
    tdsRatePct: changes.tdsRatePct || null,
    tdsLedgerName: changes.tdsLedgerName ?? null,
    reminderDays: changes.reminderDays ?? 3,
    notes: changes.notes ?? null,
  };
};

export const loanPersistence = (onSaved: () => void) => persistence(LOANS_PATH, toLoanRecord, loanBody, onSaved);

export interface EntryBody {
  kind: LoanEntryKind;
  instalmentNo: number | null;
  entryDate: string;
  principal: number;
  interest: number;
  tds: number;
  charges: number;
  bankAccountId: string | null;
  reference: string | null;
  voucherNumber: string | null;
}

export const recordLoanEntry = (loanId: string, body: EntryBody) =>
  apiRequest<LoanDetailView>(`${loanPath(loanId)}/entries`, { method: "POST", body });

export const cancelLoanEntry = (loanId: string, entryId: string) =>
  apiRequest<LoanDetailView>(`${loanPath(loanId)}/entries/${entryId}/cancel`, { method: "POST" });
