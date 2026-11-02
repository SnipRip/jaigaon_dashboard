import type { Metadata } from "next";
import { PartyScreen } from "@/features/parties/party-screens";

export const metadata: Metadata = { title: "New vendor" };

export default function NewVendorPage() {
  return <PartyScreen role="vendor" />;
}
