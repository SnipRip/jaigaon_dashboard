// Chart of accounts and statements as the backend returns them
// (backend/src/ledgers, backend/src/books). Amounts in the books are signed
// debit-positive unless a field says otherwise.

export type GroupNature = "ASSET" | "LIABILITY" | "INCOME" | "EXPENSE";
export type DrCr = "DR" | "CR";
export type TaxKind = "CGST" | "SGST" | "IGST" | "CESS" | "TDS" | "TCS" | "OTHER";

export interface LedgerGroupView {
  id: string;
  name: string;
  parentId: string | null;
  parentName: string | null;
  /** Its own (primary groups) or its primary group's. */
  nature: GroupNature;
  affectsGrossProfit: boolean;
  primaryName: string;
  isPredefined: boolean;
  behavesAsSubLedger: boolean;
  nettBalances: boolean;
  position: number;
  notes: string | null;
  ledgerCount: number;
  childCount: number;
}

export interface LedgerView {
  id: string;
  name: string;
  /** Null only for Profit & Loss A/c (Primary). */
  groupId: string | null;
  groupName: string | null;
  primaryName: string | null;
  /** Group names from the primary group down to the ledger's group. */
  path: string[];
  nature: GroupNature | null;
  openingBalance: number;
  openingSide: DrCr;
  /** Set on the ledgers the app posts to. */
  systemRole: string | null;
  taxKind: TaxKind | null;
  notes: string | null;
  isArchived: boolean;
}

/** Which master owns a ledger in the books. */
export type LedgerSource = "ledger" | "head" | "bankCash" | "loan" | "party" | "stock" | "unlisted";

export interface LedgerBalanceView {
  name: string;
  groupId: string | null;
  source: LedgerSource;
  sourceId: string | null;
  opening: number;
  debit: number;
  credit: number;
  closing: number;
}

export interface GroupBalanceView {
  id: string;
  name: string;
  opening: number;
  debit: number;
  credit: number;
  closing: number;
  behavesAsSubLedger: boolean;
  groups: GroupBalanceView[];
  ledgers: LedgerBalanceView[];
}

export interface BooksBasis {
  asOf: string;
  stock: { opening: number; closing: number };
  voucherCount: number;
}

export interface TrialBalanceView extends BooksBasis {
  groups: GroupBalanceView[];
  profitAndLoss: LedgerBalanceView | null;
  /** Sum of all opening balances, debit positive; zero when the openings agree. */
  differenceInOpening: number;
  totalDebit: number;
  totalCredit: number;
}

export interface StatementLineView {
  name: string;
  /** In the side's normal sign. */
  amount: number;
  group?: GroupBalanceView;
}

export interface ProfitAndLossView extends BooksBasis {
  openingStock: number;
  tradingExpenses: StatementLineView[];
  tradingIncomes: StatementLineView[];
  closingStock: number;
  grossProfit: number;
  indirectExpenses: StatementLineView[];
  indirectIncomes: StatementLineView[];
  netProfit: number;
}

export interface BalanceSheetView extends BooksBasis {
  liabilities: StatementLineView[];
  assets: StatementLineView[];
  profitAndLoss: { opening: number; currentPeriod: number; total: number };
  /** Credit positive: with the liabilities; negative goes with the assets. */
  differenceInOpening: number;
  closingStock: number;
  totalLiabilities: number;
  totalAssets: number;
}
