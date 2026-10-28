import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { expenses } from "@/features/expenses/sample-data";
import { invoices } from "@/features/invoices/sample-data";
import { items } from "@/features/items/sample-data";
import { parties } from "@/features/parties/sample-data";
import { buildProfitReport } from "@/features/profit/profit-report";
import { ProfitWorkspace } from "@/features/profit/profit-workspace";
import { shipments } from "@/features/shipments/sample-data";

export const metadata: Metadata = { title: "Actual profit" };

const report = buildProfitReport(invoices, shipments, items, expenses, parties);

export default function ProfitPage() {
  return (
    <>
      <SampleDataNotice />
      <ProfitWorkspace
        rows={{ invoice: report.byInvoice, shipment: report.byShipment, customer: report.byCustomer, item: report.byItem }}
        total={report.total}
        overheads={report.overheads}
      />
    </>
  );
}
