import type { Metadata } from "next";
import { LedgersScreen } from "@/features/ledgers/ledgers-screen";

export const metadata: Metadata = { title: "Groups & ledgers" };

export default function LedgersPage() {
  return <LedgersScreen />;
}
