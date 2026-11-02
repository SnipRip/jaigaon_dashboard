import type { Metadata } from "next";
import { PartiesScreen } from "@/features/parties/party-screens";

export const metadata: Metadata = { title: "Vendors" };

export default function VendorsPage() {
  return <PartiesScreen role="vendor" />;
}
