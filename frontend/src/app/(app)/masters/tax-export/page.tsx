import type { Metadata } from "next";
import { TaxExportScreen } from "@/features/tax-export/tax-export-screen";

export const metadata: Metadata = { title: "GST & export setup" };

export default function TaxExportPage() {
  return <TaxExportScreen />;
}
