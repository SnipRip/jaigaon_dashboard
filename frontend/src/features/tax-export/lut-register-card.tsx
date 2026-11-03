"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassModal } from "@/components/ui/glass-modal";
import { GlassTable } from "@/components/ui/glass-table";
import { StatusChip, type StatusTone } from "@/components/ui/status-chip";
import { TextField } from "@/components/ui/text-field";
import { saveErrorText } from "@/lib/api-client";
import { financialYearOf } from "@/lib/financial-year";
import { formatDate } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import { lutFor, lutStatus, type LutStatus } from "./lut-rules";
import { lutSchema, type LutValues } from "./lut-schema";
import { deleteLut, saveLut, toLutValues } from "./luts-api";
import type { Lut } from "./types";

const STATUS: Record<LutStatus, { tone: StatusTone; label: string }> = {
  active: { tone: "success", label: "In force" },
  expiring: { tone: "warning", label: "Expires within 30 days" },
  expired: { tone: "neutral", label: "Expired" },
  upcoming: { tone: "brand", label: "Starts later" },
};

const BLANK: LutValues = { arn: "", adCode: "", validFrom: "", validTo: "" };

type Notice = { tone: "success" | "error"; text: string };

interface LutRegisterCardProps {
  luts: Lut[];
  /** Reloads the register after a change. */
  onChanged: () => Promise<void>;
}

// LUTs by financial year, stored in the backend. An export invoice under LUT
// quotes the one in force on its date, so a missing or expired LUT is shown
// loudly.
export function LutRegisterCard({ luts, onChanged }: LutRegisterCardProps) {
  const today = useToday();
  // undefined: dialog closed; null: adding; a Lut: editing it.
  const [editing, setEditing] = useState<Lut | null | undefined>(undefined);
  const [notice, setNotice] = useState<Notice | null>(null);
  const current = today ? lutFor(luts, today) : undefined;

  const close = () => setEditing(undefined);
  const done = async (text: string) => {
    await onChanged();
    close();
    setNotice({ tone: "success", text });
  };

  return (
    <GlassCard className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <CardTitle>LUT and AD code by year</CardTitle>
        {today && !current && <StatusChip tone="danger">No LUT in force today: exports must charge IGST</StatusChip>}
        <Button variant="outline" className="ml-auto" onClick={() => setEditing(null)}>
          <Plus aria-hidden="true" className="size-[18px]" />
          Add year
        </Button>
      </div>
      <p className="text-sm font-medium text-muted">
        Both are renewed every financial year. The LUT (RFD-11 on the GST portal) lets us export without charging GST; the
        AD code goes on the shipping bill.
      </p>
      {luts.length === 0 ? (
        <p className="text-sm font-semibold text-muted">No LUT entered yet. Add this year&apos;s from the RFD-11 acknowledgement.</p>
      ) : (
        <GlassTable className="min-w-[480px]">
          <thead>
            <tr>
              <th scope="col" className="text-left">Year · LUT ARN</th>
              <th scope="col" className="text-left">AD code</th>
              <th scope="col" className="text-left">Valid</th>
              <th scope="col" className="text-left">Status</th>
              <th scope="col"><span className="sr-only">Edit</span></th>
            </tr>
          </thead>
          <tbody className="font-semibold">
            {luts.map((lut) => (
              <tr key={lut.id}>
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
                <td className="text-right">
                  <button
                    type="button"
                    aria-label={`Edit the ${lut.financialYear} LUT`}
                    onClick={() => setEditing(lut)}
                    className="glass-control glass-press inline-flex size-7 items-center justify-center text-muted hover:text-ink"
                  >
                    <Pencil aria-hidden="true" className="size-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </GlassTable>
      )}
      {notice && <FormMessage tone={notice.tone}>{notice.text}</FormMessage>}

      <GlassModal
        open={editing !== undefined}
        onOpenChange={(open) => !open && close()}
        title={editing ? `LUT ${editing.financialYear}` : "Add a year"}
        description="From the acknowledgement the GST portal gives after filing RFD-11."
      >
        {editing !== undefined && (
          <LutForm
            key={editing?.id ?? "new"}
            lut={editing ?? undefined}
            onCancel={close}
            onSaved={(values) => done(`LUT ${financialYearOf(values.validFrom)} saved.`)}
            onDeleted={(lut) => done(`LUT ${lut.financialYear} deleted.`)}
          />
        )}
      </GlassModal>
    </GlassCard>
  );
}

interface LutFormProps {
  lut?: Lut;
  onCancel: () => void;
  onSaved: (values: LutValues) => Promise<void>;
  onDeleted: (lut: Lut) => Promise<void>;
}

function LutForm({ lut, onCancel, onSaved, onDeleted }: LutFormProps) {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LutValues>({ resolver: zodResolver(lutSchema), defaultValues: lut ? toLutValues(lut) : BLANK });
  const validFrom = useWatch({ control, name: "validFrom" });

  const run = async (call: () => Promise<void>) => {
    setError(null);
    try {
      await call();
    } catch (failure) {
      setError(saveErrorText(failure));
    }
  };

  const submit = handleSubmit((values) =>
    run(async () => {
      await saveLut(lut, values);
      await onSaved(values);
    }),
  );

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3.5">
      <TextField label="LUT ARN" autoCapitalize="characters" error={errors.arn?.message} {...register("arn")} />
      <TextField
        label="AD code for this year"
        hint="Can be added later"
        autoCapitalize="characters"
        error={errors.adCode?.message}
        {...register("adCode")}
      />
      <div className="grid gap-3.5 sm:grid-cols-2">
        <TextField label="Valid from" type="date" error={errors.validFrom?.message} {...register("validFrom")} />
        <TextField label="Valid to" type="date" hint="31 March at the latest" error={errors.validTo?.message} {...register("validTo")} />
      </div>
      {validFrom && /^\d{4}-\d{2}-\d{2}$/.test(validFrom) && (
        <p className="text-xs font-medium text-muted">Financial year {financialYearOf(validFrom)}</p>
      )}
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2.5">
        {lut && (
          <Button
            variant="danger"
            className="mr-auto"
            disabled={isSubmitting}
            onClick={() =>
              void run(async () => {
                await deleteLut(lut);
                await onDeleted(lut);
              })
            }
          >
            <Trash2 aria-hidden="true" className="size-[18px]" />
            Delete
          </Button>
        )}
        <Button variant="neutral" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {lut ? "Save" : "Add year"}
        </Button>
      </div>
    </form>
  );
}
