import type { Metadata } from "next";
import { LoanRemindersCard } from "@/features/loans/loan-reminders-card";
import { LoansMaster } from "@/features/loans/loans-master";

export const metadata: Metadata = { title: "Loans & advances" };

export default function LoansPage() {
  return (
    <>
      <LoanRemindersCard />
      <LoansMaster />
    </>
  );
}
