import type { Metadata } from "next";
import { Suspense } from "react";
import { LoanDetailScreen } from "@/features/loans/loan-detail-screen";

type LoanParams = PageProps<"/loans/[loanId]">["params"];

export const metadata: Metadata = { title: "Loan" };

// `params` is request data, so it is read inside a Suspense boundary.
export default function LoanPage({ params }: { params: LoanParams }) {
  return (
    <Suspense>
      <LoanDetail params={params} />
    </Suspense>
  );
}

async function LoanDetail({ params }: { params: LoanParams }) {
  return <LoanDetailScreen loanId={(await params).loanId} />;
}
