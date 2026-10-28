import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { BankCashMaster } from "@/features/masters/bank-cash-master";
import { moneyAccounts } from "@/features/masters/sample-data";

export const metadata: Metadata = { title: "Bank & cash" };

export default function BankCashPage() {
  return (
    <>
      <SampleDataNotice />
      <BankCashMaster accounts={moneyAccounts} />
    </>
  );
}
