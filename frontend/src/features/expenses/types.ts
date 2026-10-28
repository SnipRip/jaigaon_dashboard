// An expense: money spent that is not stock (SOW 13). Its head says what it
// is; its allocation says whose profit it reduces (masters-plan.md F23).
import type { ExpenseHead } from "@/features/masters/types";

export interface ExpenseAllocation {
  kind: ExpenseHead["allocation"];
  /** Bill id (item cost), invoice id or shipment id. None for overhead. */
  targetId?: string;
}

export interface Expense {
  id: string;
  /** EXPN/2627/0041 */
  number: string;
  date: string;
  headId: string;
  description: string;
  /** Before GST. */
  amount: number;
  gstRatePct: number;
  /** Who was paid: a vendor record, or a name for small cash payees. */
  vendorId?: string;
  payee?: string;
  /** Bank or cash account it was paid from; none when still owed. */
  paidFrom?: string;
  /** Slip or bill number from the payee. */
  reference?: string;
  allocation: ExpenseAllocation;
  fileName?: string;
}
