// Which heads a screen may pick, and finding the head a record points at.
// Sample records name their head by its ledger name; saved ones will carry
// its id, so both are matched (names ignoring case, as Tally does).
import type { AccountHead } from "./types";

/** Ledgers loan interest posts to when a loan names no head (backend common/tally/tally-groups.ts). */
export const DEFAULT_INTEREST_LEDGER = "Interest on Loan";
export const DEFAULT_INTEREST_RECEIVED_LEDGER = "Interest Received";

export const isExpenseHead = (head: Pick<AccountHead, "nature">) => head.nature === "direct-expense" || head.nature === "indirect-expense";

export const isIncomeHead = (head: Pick<AccountHead, "nature">) => !isExpenseHead(head);

/** Live expense heads: what bills and expenses pick from. */
export const expenseHeadsOf = (heads: AccountHead[]) => heads.filter((head) => !head.archived && isExpenseHead(head));

/** Live income heads. */
export const incomeHeadsOf = (heads: AccountHead[]) => heads.filter((head) => !head.archived && isIncomeHead(head));

/** The head with this id, else this ledger name. */
export function findHead<T extends Pick<AccountHead, "id" | "name">>(heads: T[], ref: string): T | undefined {
  const name = ref.trim().toLowerCase();
  return heads.find((head) => head.id === ref) ?? heads.find((head) => head.name.toLowerCase() === name);
}

/** What to call the head a record points at: its current name, else what the record says. */
export const headName = (heads: Pick<AccountHead, "id" | "name">[], ref: string) => findHead(heads, ref)?.name ?? ref;
