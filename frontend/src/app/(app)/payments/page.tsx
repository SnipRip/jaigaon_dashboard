import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { documentNumbers, names, payable, receivable } from "@/features/payments/payment-data";
import { PaymentsWorkspace } from "@/features/payments/payments-workspace";
import { receipts, vendorPayments } from "@/features/payments/sample-data";

export const metadata: Metadata = { title: "Payments & outstanding" };

export default function PaymentsPage() {
  return (
    <>
      <SampleDataNotice />
      <PaymentsWorkspace
        receivable={receivable}
        payable={payable}
        receipts={receipts}
        payments={vendorPayments}
        names={names}
        documentNumbers={documentNumbers}
      />
    </>
  );
}
