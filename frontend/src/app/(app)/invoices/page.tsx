import type { Metadata } from "next";
import { InvoicesListScreen } from "@/features/invoices/invoice-screens";

export const metadata: Metadata = { title: "Sales & invoices" };

export default function InvoicesPage() {
  return <InvoicesListScreen />;
}
