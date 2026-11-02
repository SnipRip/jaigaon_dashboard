import type { Metadata } from "next";
import { PartiesScreen } from "@/features/parties/party-screens";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage() {
  return <PartiesScreen role="customer" />;
}
