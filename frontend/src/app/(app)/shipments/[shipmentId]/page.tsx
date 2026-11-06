import type { Metadata } from "next";
import { Suspense } from "react";
import { ShipmentDetailScreen } from "@/features/shipments/shipment-screens";

export const metadata: Metadata = { title: "Shipment" };

type ShipmentParams = PageProps<"/shipments/[shipmentId]">["params"];

// `params` is request data, so it is read inside a Suspense boundary.
export default function ShipmentPage({ params }: { params: ShipmentParams }) {
  return (
    <Suspense>
      <Shipment params={params} />
    </Suspense>
  );
}

async function Shipment({ params }: { params: ShipmentParams }) {
  return <ShipmentDetailScreen shipmentId={(await params).shipmentId} />;
}
