import type { Metadata } from "next";
import { HsnScreen } from "@/features/hsn/hsn-screen";

export const metadata: Metadata = { title: "HSN / SAC codes" };

export default function HsnPage() {
  return <HsnScreen />;
}
