"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Button, buttonClasses } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { SelectField } from "@/components/ui/select-field";
import { StatusChip } from "@/components/ui/status-chip";
import { TextArea } from "@/components/ui/text-area";
import { TextField } from "@/components/ui/text-field";
import type { Invoice } from "@/features/invoices/types";
import type { Transporter, Vehicle } from "@/features/masters/types";
import { formatDayMonth, formatQuantity } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import { shipmentSchema, type ShipmentFormValues } from "./shipment-schema";

interface ShipmentFormProps {
  /** Export invoices not on a shipment yet. */
  invoices: Invoice[];
  customers: Record<string, string>;
  vehicles: Vehicle[];
  transporters: Transporter[];
  defaultBorderPoint: string;
  suggestedNumber: string;
}

const NONE = "none";

// A new truck to Bhutan: pick the export invoices it carries (one buyer per
// truck), then the vehicle and driver. Packages and weight come from the
// packing lists already attached to the invoices.
export function ShipmentForm({ invoices, customers, vehicles, transporters, defaultBorderPoint, suggestedNumber }: ShipmentFormProps) {
  const today = useToday();
  const [result, setResult] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ShipmentFormValues>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
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

  const invoiceIds = useWatch({ control, name: "invoiceIds" });
  const picked = invoices.filter((invoice) => invoiceIds.includes(invoice.id));
  const buyer = picked[0]?.partyId;

  const toggleInvoice = (invoice: Invoice) => {
    const next = invoiceIds.includes(invoice.id) ? invoiceIds.filter((id) => id !== invoice.id) : [...invoiceIds, invoice.id];
    setValue("invoiceIds", next, { shouldValidate: true });
    const chosen = invoices.filter((candidate) => next.includes(candidate.id));
    const sum = (key: "packages" | "grossKg") => chosen.reduce((total, candidate) => total + (Number(candidate.documents["packing-list"]?.details[key]) || 0), 0);
    setValue("packages", sum("packages") ? String(sum("packages")) : "");
    setValue("grossWeightKg", sum("grossKg") ? String(sum("grossKg")) : "");
    if (chosen[0]?.vehicleNumber && !getValues("vehicleNumber")) setValue("vehicleNumber", chosen[0].vehicleNumber);
  };

  const pickVehicle = (id: string) => {
    const vehicle = vehicles.find((candidate) => candidate.id === id);
    if (!vehicle) return;
    setValue("vehicleNumber", vehicle.number, { shouldValidate: true });
    setValue("transporterId", vehicle.transporterId ?? "");
    setValue("driverName", vehicle.driverName ?? "");
    setValue("driverPhone", vehicle.driverPhone ?? "");
  };

  const onSubmit = handleSubmit(
    () => setResult({ tone: "success", text: "The shipment checks out. Saving switches on when shipments are connected to the database." }),
    () => setResult({ tone: "error", text: "Some fields need attention. See the ones marked in red above." }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="@container flex flex-col gap-4">
      <GlassCard className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Invoices on this truck</CardTitle>
          <StatusChip tone="neutral">{suggestedNumber}</StatusChip>
        </div>
        <p className="-mt-1.5 text-sm font-medium text-muted">One buyer per truck. Only export invoices not yet on a shipment are listed.</p>
        {invoices.length === 0 ? (
          <p className="text-sm font-semibold text-muted">
            Every export invoice is already on a shipment.{" "}
            <Link href="/invoices/new/export" className="font-bold text-brand hover:underline">
              Make an export invoice
            </Link>
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {invoices.map((invoice) => (
              <FilterChip
                key={invoice.id}
                selected={invoiceIds.includes(invoice.id)}
                disabled={Boolean(buyer) && invoice.partyId !== buyer}
                onClick={() => toggleInvoice(invoice)}
                className="h-auto py-2 text-left disabled:opacity-45"
              >
                <span className="block">{invoice.number}</span>
                <span className="block text-xs font-semibold text-muted">
                  {customers[invoice.partyId]} · {formatDayMonth(invoice.date)}
                  {invoice.status === "draft" && " · draft"}
                </span>
              </FilterChip>
            ))}
          </div>
        )}
        {errors.invoiceIds && <p className="text-xs font-semibold text-danger-strong">{errors.invoiceIds.message}</p>}
      </GlassCard>

      <GlassCard className="flex flex-col gap-3.5">
        <CardTitle>Truck and driver</CardTitle>
        <div className="grid gap-3.5 @xl:grid-cols-3">
          <SelectField
            label="Pick a vehicle on record"
            options={vehicles.map((vehicle) => ({ value: vehicle.id, label: `${vehicle.number} · ${vehicle.capacityTons} t${vehicle.ownership === "own" ? " · own" : ""}` }))}
            onValueChange={pickVehicle}
          />
          <TextField label="Vehicle number" placeholder="WB73E1234" error={errors.vehicleNumber?.message} {...register("vehicleNumber")} />
          <TextField label="Loading date" type="date" error={errors.date?.message} {...register("date")} />
        </div>
        <div className="grid gap-3.5 @xl:grid-cols-3">
          <Controller
            control={control}
            name="transporterId"
            render={({ field }) => (
              <SelectField
                label="Transporter"
                options={[{ value: NONE, label: "Our own truck" }, ...transporters.map((transporter) => ({ value: transporter.id, label: transporter.name }))]}
                value={field.value || NONE}
                onValueChange={(value) => field.onChange(value === NONE ? "" : value)}
              />
            )}
          />
          <TextField label="Driver" error={errors.driverName?.message} {...register("driverName")} />
          <TextField label="Driver's phone" inputMode="tel" error={errors.driverPhone?.message} {...register("driverPhone")} />
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
          <TextField label="Seal number" error={errors.sealNumber?.message} {...register("sealNumber")} />
          <TextField label="Packages" inputMode="numeric" hint="From the packing lists" error={errors.packages?.message} {...register("packages")} />
          <TextField label="Gross weight (kg)" inputMode="numeric" hint="From the packing lists" error={errors.grossWeightKg?.message} {...register("grossWeightKg")} />
        </div>
        {picked.length > 0 && (
          <p className="text-xs font-semibold text-muted">
            {formatQuantity(picked.reduce((sum, invoice) => sum + invoice.lines.length, 0))} lines on {picked.length} invoice{picked.length > 1 ? "s" : ""} for{" "}
            {buyer ? customers[buyer] : ""}.
          </p>
        )}
        <TextArea label="Notes" rows={2} error={errors.notes?.message} {...register("notes")} />
      </GlassCard>

      <GlassCard className="flex flex-col gap-3">
        {result && <FormMessage tone={result.tone}>{result.text}</FormMessage>}
        <div className="flex flex-wrap gap-2.5">
          <Button type="submit" variant="success" className="h-[50px] px-6">
            Plan shipment
          </Button>
          <Link href="/shipments" className={buttonClasses("neutral", "ml-auto h-[50px]")}>
            Back to shipments
          </Link>
        </div>
        <p className="text-xs font-semibold text-muted">The challan, e-way bill, shipping bill and LEO are attached on each invoice; the shipment page shows which are still missing.</p>
      </GlassCard>
    </form>
  );
}
