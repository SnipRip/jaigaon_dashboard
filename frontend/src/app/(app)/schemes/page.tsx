import type { Metadata } from "next";
import { SchemesScreen } from "@/features/schemes/schemes-screen";

export const metadata: Metadata = { title: "Schemes & discounts" };

export default function SchemesPage() {
  return <SchemesScreen />;
}
