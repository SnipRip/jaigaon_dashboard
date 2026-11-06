"use client";

import useSWR from "swr";
import { FormMessage } from "@/components/ui/form-message";
import { LoadNotice } from "@/components/ui/load-notice";
import { useCompanyProfile } from "@/features/company/use-company-profile";
import { INVOICES_PATH } from "@/features/invoices/invoices-api";
import { PARTIES_PATH } from "@/features/parties/parties-api";
import { apiGet } from "@/lib/api-client";
import type { InvoiceView } from "@/types/invoice";
import type { PartyView } from "@/types/party";
import type { ShipmentView } from "@/types/shipment";
import { ShipmentDetail } from "./shipment-detail";
import { ShipmentForm } from "./shipment-form";
import { SHIPMENTS_PATH, shipmentPath, shippedInvoiceIds } from "./shipments-api";
import { ShipmentsWorkspace } from "./shipments-workspace";

// The shipment pages' client screens, on the backend (/shipments).

export function ShipmentsScreen() {
  const { data, error } = useSWR<ShipmentView[]>(SHIPMENTS_PATH, apiGet);
  if (!data) return <LoadNotice error={error} what="shipments" />;
  return <ShipmentsWorkspace shipments={data} />;
}

/** The form for a new shipment, or for correcting `shipmentId`. */
export function ShipmentFormScreen({ shipmentId }: { shipmentId?: string }) {
  const shipments = useSWR<ShipmentView[]>(SHIPMENTS_PATH, apiGet);
  const current = useSWR<ShipmentView>(shipmentId ? shipmentPath(shipmentId) : null, apiGet);
  const invoices = useSWR<InvoiceView[]>(INVOICES_PATH, apiGet);
  const vendors = useSWR<PartyView[]>(`${PARTIES_PATH}?role=vendor`, apiGet);
  const { profile, error: profileError } = useCompanyProfile();
  const error = shipments.error ?? current.error ?? invoices.error ?? vendors.error ?? profileError;
  if (!shipments.data || (shipmentId && !current.data) || !invoices.data || !vendors.data || !profile) return <LoadNotice error={error} what="the form" />;
  if (current.data?.cancelledAt) return <FormMessage tone="error">This shipment is cancelled; it can no longer be changed.</FormMessage>;
  const taken = shippedInvoiceIds(shipments.data, shipmentId);
  return (
    <ShipmentForm
      invoices={invoices.data.filter((invoice) => invoice.kind === "EXPORT" && invoice.status === "ISSUED" && !taken.has(invoice.id))}
      transporters={vendors.data.filter((party) => !party.isArchived || party.id === current.data?.transporterId)}
      defaultBorderPoint={profile.customsStation ?? ""}
      shipment={current.data}
      onSaved={async (saved) => {
        await Promise.all([shipments.mutate(), current.mutate(saved, { revalidate: false })]);
      }}
    />
  );
}

export function ShipmentDetailScreen({ shipmentId }: { shipmentId: string }) {
  const { data, error, mutate } = useSWR<ShipmentView>(shipmentPath(shipmentId), apiGet);
  if (!data) return <LoadNotice error={error} what="the shipment" />;
  return (
    <ShipmentDetail
      shipment={data}
      onChanged={async (next) => {
        await mutate(next, { revalidate: false });
      }}
    />
  );
}
