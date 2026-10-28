import type { Metadata } from "next";
import { InvoiceKindPicker } from "@/features/invoices/invoice-kind-picker";

export const metadata: Metadata = { title: "New invoice" };

export default function NewInvoicePage() {
  return <InvoiceKindPicker />;
}
