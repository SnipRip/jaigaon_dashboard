import type { Metadata } from "next";
import { PaymentsScreen } from "@/features/payments/payment-screens";

export const metadata: Metadata = { title: "Payments & outstanding" };

export default function PaymentsPage() {
  return <PaymentsScreen />;
}
