"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import useSWR from "swr";
import { Button, buttonClasses } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterGroup } from "@/components/ui/filter-group";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { SelectField } from "@/components/ui/select-field";
import { StatusChip } from "@/components/ui/status-chip";
import { TextArea } from "@/components/ui/text-area";
import { TextField } from "@/components/ui/text-field";
import { ApiError, apiGet } from "@/lib/api-client";
import { formatDayMonth, formatInr } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import type { InvoiceView } from "@/types/invoice";
import type { PartyView } from "@/types/party";
import type { ShipmentView } from "@/types/shipment";
import { normaliseVehicle, shipmentSchema, type ShipmentFormValues } from "./shipment-schema";
import { createShipment, shipmentNumberPreviewPath, updateShipment, type ShipmentBody } from "./shipments-api";

interface ShipmentFormProps {
  /** Issued export invoices not on another live shipment (an edited shipment's own included). */
  invoices: InvoiceView[];
  /** Vendors on record, for the transporter. */
  transporters: PartyView[];
  /** The customs station on GST & export setup. */
  defaultBorderPoint: string;
  /** Editing a saved shipment. */
  shipment?: ShipmentView;
  onSaved: (saved: ShipmentView) => Promise<void>;
}

const NONE = "none";
const text = (value: string) => value.trim() || null;

const valuesOf = (shipment: ShipmentView, fallbackBorder: string): ShipmentFormValues => ({
  invoiceIds: shipment.invoices.map((invoice) => invoice.id),
  date: shipment.date,
  vehicleNumber: shipment.vehicleNumber,
  transporterId: shipment.transporterId ?? "",
  driverName: shipment.driverName ?? "",
  driverPhone: shipment.driverPhone ?? "",
  destination: shipment.destination,
  borderPoint: shipment.borderPoint || fallbackBorder,
  customsAgent: shipment.customsAgent ?? "",
  sealNumber: shipment.sealNumber ?? "",
  packages: shipment.packages ? String(shipment.packages) : "",
  grossWeightKg: shipment.grossWeightKg ? String(shipment.grossWeightKg) : "",
  notes: shipment.notes ?? "",
});

// A truck to Bhutan: pick the export invoices it carries (one buyer per
// truck), then the vehicle and driver. Packages and weight are added up from
// the packing lists attached to the invoices. Editing corrects the transport
// details; the invoices only until the truck leaves the yard.
export function ShipmentForm({ invoices, transporters, defaultBorderPoint, shipment, onSaved }: ShipmentFormProps) {
  const router = useRouter();
  const today = useToday();
  const [problem, setProblem] = useState<string | null>(null);
  const locked = shipment?.invoicesLocked ?? false;
  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ShipmentFormValues>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: shipment
      ? valuesOf(shipment, defaultBorderPoint)
      : {
          invoiceIds: [],
          date: "",
          vehicleNumber: "",
          transporterId: "",
          driverName: "",
          driverPhone: "",
          destination: "",
          borderPoint: defaultBorderPoint,
          customsAgent: "",
          sealNumber: "",
          packages: "",
          grossWeightKg: "",
          notes: "",
        },
  });

  useEffect(() => {
    if (today && !getValues("date")) setValue("date", today);
  }, [today, getValues, setValue]);

  const [invoiceIds, date] = useWatch({ control, name: ["invoiceIds", "date"] });
  const { data: nextNumber } = useSWR<{ number: string | null }>(!shipment && date ? shipmentNumberPreviewPath(date) : null, apiGet);
  const picked = invoices.filter((invoice) => invoiceIds.includes(invoice.id));
  const buyer = picked[0]?.partyId;

  const toggleInvoice = (invoice: InvoiceView) => {
    const next = invoiceIds.includes(invoice.id) ? invoiceIds.filter((id) => id !== invoice.id) : [...invoiceIds, invoice.id];
    setValue("invoiceIds", next, { shouldValidate: true });
    const chosen = invoices.filter((candidate) => next.includes(candidate.id));
    const sum = (key: "packages" | "grossKg") =>
      chosen.reduce((total, candidate) => total + (Number(candidate.documents.find((doc) => doc.kind === "PACKING_LIST")?.details[key]) || 0), 0);
    if (sum("packages")) setValue("packages", String(sum("packages")));
    if (sum("grossKg")) setValue("grossWeightKg", String(Math.round(sum("grossKg") * 1000) / 1000));
    if (chosen[0]?.vehicleNumber && !getValues("vehicleNumber")) setValue("vehicleNumber", chosen[0].vehicleNumber);
    const city = chosen[0]?.shipToCity;
    if (city && !getValues("destination")) setValue("destination", city);
  };

  const onSubmit = handleSubmit(
    async (values) => {
      setProblem(null);
      const body: ShipmentBody = {
        date: values.date,
        partyId: invoices.find((invoice) => invoice.id === values.invoiceIds[0])!.partyId,
        invoiceIds: values.invoiceIds,
        vehicleNumber: normaliseVehicle(values.vehicleNumber),
        transporterId: values.transporterId || null,
        driverName: text(values.driverName),
        driverPhone: text(values.driverPhone),
        destination: values.destination.trim(),
        borderPoint: values.borderPoint.trim(),
        customsAgent: text(values.customsAgent),
        sealNumber: text(values.sealNumber),
        packages: values.packages ? Number(values.packages) : null,
        grossWeightKg: values.grossWeightKg ? Number(values.grossWeightKg) : null,
        notes: text(values.notes),
      };
      try {
        const saved = shipment ? await updateShipment(shipment.id, body) : await createShipment(body);
        await onSaved(saved);
        router.push(`/shipments/${saved.id}`);
      } catch (error) {
        setProblem(error instanceof ApiError ? error.message : "Could not save. Check the connection and try again.");
      }
    },
    () => setProblem("Some fields need attention. See the ones marked in red above."),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="@container flex flex-col gap-3.5">
      <GlassCard className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Invoices on this truck</CardTitle>
          <StatusChip tone="neutral">{shipment?.number ?? nextNumber?.number ?? "Number on save"}</StatusChip>
        </div>
        <p className="-mt-1.5 text-sm font-medium text-muted">
          {locked
            ? "The truck has left the yard: its invoices no longer change."
            : "One buyer per truck. Only issued export invoices not on another shipment are listed."}
        </p>
        {invoices.length === 0 ? (
          <p className="text-sm font-semibold text-muted">
            Every export invoice is already on a shipment.{" "}
            <Link href="/invoices/new/export" className="font-semibold text-brand hover:underline">
              Make an export invoice
            </Link>
          </p>
        ) : (
          <FilterGroup label="Invoices on this shipment">
            {invoices.map((invoice) => (
              <FilterChip
                key={invoice.id}
                selected={invoiceIds.includes(invoice.id)}
                disabled={locked || (Boolean(buyer) && invoice.partyId !== buyer)}
                onClick={() => toggleInvoice(invoice)}
                className="h-auto py-2 text-left disabled:opacity-45"
              >
                <span className="block">{invoice.number}</span>
                <span className="block text-xs font-semibold text-muted">
                  {invoice.partyName} · {formatDayMonth(invoice.date)} · {formatInr(invoice.totals.total)}
                </span>
              </FilterChip>
            ))}
          </FilterGroup>
        )}
        {errors.invoiceIds && <p className="text-xs font-semibold text-danger-strong">{errors.invoiceIds.message}</p>}
      </GlassCard>

      <GlassCard className="flex flex-col gap-3.5">
        <CardTitle>Truck and driver</CardTitle>
        <div className="grid gap-3.5 @xl:grid-cols-3">
          <TextField label="Vehicle number" placeholder="WB73E1234" error={errors.vehicleNumber?.message} {...register("vehicleNumber")} />
          <TextField label="Loading date" type="date" max={today ?? undefined} error={errors.date?.message} {...register("date")} />
          <Controller
            control={control}
            name="transporterId"
            render={({ field }) => (
              <SelectField
                label="Transporter"
                options={[{ value: NONE, label: "Our own truck" }, ...transporters.map((vendor) => ({ value: vendor.id, label: vendor.displayName }))]}
                value={field.value || NONE}
                onValueChange={(value) => field.onChange(value === NONE ? "" : value)}
              />
            )}
          />
        </div>
        <div className="grid gap-3.5 @xl:grid-cols-3">
          <TextField label="Driver" error={errors.driverName?.message} {...register("driverName")} />
          <TextField label="Driver's phone" inputMode="tel" error={errors.driverPhone?.message} {...register("driverPhone")} />
          <TextField label="Seal number" error={errors.sealNumber?.message} {...register("sealNumber")} />
        </div>
      </GlassCard>

      <GlassCard className="flex flex-col gap-3.5">
        <CardTitle>Border and load</CardTitle>
        <div className="grid gap-3.5 @xl:grid-cols-3">
          <TextField label="Destination in Bhutan" placeholder="Thimphu" error={errors.destination?.message} {...register("destination")} />
          <TextField label="Border point" error={errors.borderPoint?.message} {...register("borderPoint")} />
          <TextField label="Customs agent (CHA)" placeholder="Files the shipping bill" error={errors.customsAgent?.message} {...register("customsAgent")} />
        </div>
        <div className="grid gap-3.5 @xl:grid-cols-3">
          <TextField label="Packages" inputMode="numeric" hint="From the packing lists" error={errors.packages?.message} {...register("packages")} />
          <TextField label="Gross weight (kg)" inputMode="decimal" hint="From the packing lists" error={errors.grossWeightKg?.message} {...register("grossWeightKg")} />
        </div>
        {picked.length > 0 && (
          <p className="text-xs font-semibold text-muted">
            {picked.length} invoice{picked.length > 1 ? "s" : ""} for {picked[0].partyName}, worth {formatInr(picked.reduce((sum, invoice) => sum + invoice.totals.total, 0))}.
          </p>
        )}
        <TextArea label="Notes" rows={2} error={errors.notes?.message} {...register("notes")} />
      </GlassCard>

      <GlassCard className="flex flex-col gap-3">
        {problem && <FormMessage tone="error">{problem}</FormMessage>}
        <div className="flex flex-wrap gap-2.5">
          <Button type="submit" variant="success" size="lg" disabled={isSubmitting}>
            {shipment ? "Save changes" : "Plan shipment"}
          </Button>
          <Link href={shipment ? `/shipments/${shipment.id}` : "/shipments"} className={buttonClasses("neutral", "ml-auto", "lg")}>
            {shipment ? "Back to the shipment" : "Back to shipments"}
          </Link>
        </div>
        <p className="text-xs font-semibold text-muted">
          The IRN, challan, e-way bill, shipping bill and LEO are attached on each invoice; the shipment page shows which are still missing.
        </p>
      </GlassCard>
    </form>
  );
}
