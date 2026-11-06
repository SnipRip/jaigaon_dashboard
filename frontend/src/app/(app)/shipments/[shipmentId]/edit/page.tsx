import type { Metadata } from "next";
import { Suspense } from "react";
import { ShipmentFormScreen } from "@/features/shipments/shipment-screens";

export const metadata: Metadata = { title: "Edit shipment" };

type ShipmentParams = PageProps<"/shipments/[shipmentId]/edit">["params"];

// `params` is request data, so it is read inside a Suspense boundary.
export default function EditShipmentPage({ params }: { params: ShipmentParams }) {
  return (
    <Suspense>
      <EditShipment params={params} />
    </Suspense>
  );
}

async function EditShipment({ params }: { params: ShipmentParams }) {
  return <ShipmentFormScreen shipmentId={(await params).shipmentId} />;
}
