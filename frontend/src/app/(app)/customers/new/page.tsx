import type { Metadata } from "next";
import { PartyScreen } from "@/features/parties/party-screens";

export const metadata: Metadata = { title: "New customer" };

export default function NewCustomerPage() {
  return <PartyScreen role="customer" />;
}
