"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassModal } from "@/components/ui/glass-modal";
import { GlassTable } from "@/components/ui/glass-table";
import { StatusChip, type StatusTone } from "@/components/ui/status-chip";
import { TextField } from "@/components/ui/text-field";
import { useToday } from "@/lib/use-today";
import { financialYearOf, lutStatus, type LutStatus } from "./lut-rules";
import type { Lut } from "./types";
import { formatDate } from "@/lib/format";

const STATUS: Record<LutStatus, { tone: StatusTone; label: string }> = {
  active: { tone: "success", label: "In force" },
  expiring: { tone: "warning", label: "Expires within 30 days" },
  expired: { tone: "neutral", label: "Expired" },
  upcoming: { tone: "brand", label: "Starts later" },
};

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");
const lutSchema = z
  .object({
    arn: z.string().trim().min(8, "Enter the ARN from the GST portal acknowledgement").max(40),
    adCode: z.string().trim().max(30),
    validFrom: isoDate,
    validTo: isoDate,
  })
  .refine((values) => values.validTo > values.validFrom, { path: ["validTo"], message: "Must be after the start date" });
type LutValues = z.infer<typeof lutSchema>;

// LUTs by financial year. An export invoice under LUT quotes the one in force
// on its date, so a missing or expired LUT is shown loudly.
export function LutRegisterCard({ initialLuts }: { initialLuts: Lut[] }) {
  const today = useToday();
  const [luts, setLuts] = useState(initialLuts);
  const [adding, setAdding] = useState(false);
  const current = today ? luts.find((lut) => lutStatus(lut, today) !== "expired" && lutStatus(lut, today) !== "upcoming") : undefined;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LutValues>({ resolver: zodResolver(lutSchema), defaultValues: { arn: "", adCode: "", validFrom: "", validTo: "" } });
  const validFrom = useWatch({ control, name: "validFrom" });

  const add = handleSubmit((values) => {
    setLuts((existing) => [...existing, { ...values, adCode: values.adCode || undefined, financialYear: financialYearOf(values.validFrom) }].sort((a, b) => a.validFrom.localeCompare(b.validFrom)));
    setAdding(false);
    reset();
  });

  return (
    <GlassCard className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <CardTitle>LUT and AD code by year</CardTitle>
        {today && !current && <StatusChip tone="danger">No LUT in force today: exports must charge IGST</StatusChip>}
        <Button variant="outline" className="ml-auto" onClick={() => setAdding(true)}>
          <Plus aria-hidden="true" className="size-[18px]" />
          Add year
        </Button>
      </div>
      <p className="text-sm font-medium text-muted">
        Both are renewed every financial year. The LUT (RFD-11 on the GST portal) lets us export without charging GST; the
        AD code goes on the shipping bill.
      </p>
      <GlassTable className="min-w-[440px]">
        <thead>
          <tr>
            <th scope="col" className="text-left">Year · LUT ARN</th>
            <th scope="col" className="text-left">AD code</th>
            <th scope="col" className="text-left">Valid</th>
            <th scope="col" className="text-left">Status</th>
          </tr>
        </thead>
        <tbody className="font-semibold">
          {luts.map((lut) => (
            <tr key={lut.arn}>
              <td className="text-left">
                <div className="font-semibold">{lut.financialYear}</div>
                <div className="text-xs text-muted tabular-nums">{lut.arn}</div>
              </td>
              <td className="text-left text-xs tabular-nums">{lut.adCode ?? <span className="text-warning-strong">Not entered</span>}</td>
              <td className="text-left whitespace-nowrap">
                {formatDate(lut.validFrom)} – {formatDate(lut.validTo)}
              </td>
              <td className="text-left">
                {today ? <StatusChip tone={STATUS[lutStatus(lut, today)].tone}>{STATUS[lutStatus(lut, today)].label}</StatusChip> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </GlassTable>

      <GlassModal
        open={adding}
        onOpenChange={setAdding}
        title="Add a year"
        description="From the acknowledgement the GST portal gives after filing RFD-11."
      >
        <form onSubmit={add} noValidate className="flex flex-col gap-3.5">
          <TextField label="LUT ARN" error={errors.arn?.message} {...register("arn")} />
          <TextField label="AD code for this year" hint="Can be added later" error={errors.adCode?.message} {...register("adCode")} />
          <div className="grid gap-3.5 sm:grid-cols-2">
            <TextField label="Valid from" type="date" error={errors.validFrom?.message} {...register("validFrom")} />
            <TextField label="Valid to" type="date" error={errors.validTo?.message} {...register("validTo")} />
          </div>
          {validFrom && /^\d{4}-\d{2}-\d{2}$/.test(validFrom) && (
            <p className="text-xs font-medium text-muted">Financial year {financialYearOf(validFrom)}</p>
          )}
          <div className="flex justify-end gap-2.5">
            <Button variant="neutral" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button type="submit">Add year</Button>
          </div>
        </form>
      </GlassModal>
    </GlassCard>
  );
}
