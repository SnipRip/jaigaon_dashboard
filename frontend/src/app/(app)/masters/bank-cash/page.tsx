import type { Metadata } from "next";
import { BankCashMaster } from "@/features/masters/bank-cash-master";

export const metadata: Metadata = { title: "Bank & cash" };

export default function BankCashPage() {
  return <BankCashMaster />;
}
