"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { checkGstin, gstinStateCode } from "@/features/gst/gstin";
import { stateName } from "@/features/gst/indian-states";
import type { ExportSettings } from "./types";

const optional = (pattern: RegExp, message: string) => z.union([z.literal(""), z.string().trim().regex(pattern, message)]);

const settingsSchema = (companyState: string) =>
  z.object({
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .refine((value) => !value || checkGstin(value).valid, { message: "Enter a valid GSTIN" })
      .refine((value) => !value || gstinStateCode(value) === companyState, {
        message: `Our GSTIN should start with ${companyState} (${stateName(companyState)})`,
      }),
    iec: optional(/^[A-Z0-9]{10}$/i, "The IEC has 10 letters and digits"),
    adBank: z.string().max(80),
    customsStation: z.string().max(80),
    portCode: optional(/^[A-Z0-9]{6}$/i, "Port codes have 6 letters and digits, as printed on the shipping bill"),
    defaultRoute: z.enum(["lut", "igst"]),
    invoiceCurrency: z.enum(["INR", "BTN"]),
  });
type SettingsValues = z.infer<ReturnType<typeof settingsSchema>>;

interface ExportSettingsFormProps {
  companyState: string;
  companyGstin?: string;
  initial: ExportSettings;
}

// Our own registration and export identifiers: everything an export invoice
// and shipping bill print about us.
export function ExportSettingsForm({ companyState, companyGstin, initial }: ExportSettingsFormProps) {
  const [result, setResult] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema(companyState)),
    defaultValues: { gstin: companyGstin ?? "", ...initial },
  });

  const onSubmit = handleSubmit(() => setResult("All fields check out. Saving switches on when settings are connected to the database."));

  return (
    <GlassCard className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1">
        <CardTitle>Our registration</CardTitle>
        <p className="text-sm font-medium text-muted">
          Registered in {stateName(companyState)} (state code {companyState}). Sales inside {stateName(companyState)} get
          CGST + SGST; everywhere else in India, IGST.
        </p>
      </div>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3.5">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
          <TextField label="Our GSTIN" placeholder="Still to come from the client" error={errors.gstin?.message} {...register("gstin")} />
          <TextField label="IEC (Importer-Exporter Code)" placeholder="10 characters, from DGFT" error={errors.iec?.message} {...register("iec")} />
          <TextField label="AD code bank" placeholder="Bank that receives export payments" error={errors.adBank?.message} {...register("adBank")} />
          <TextField label="Customs station" error={errors.customsStation?.message} {...register("customsStation")} />
          <TextField
            label="Default port code"
            placeholder="INJIGB"
            hint="Jaigaon LCS is INJIGB. Each shipping bill can use another port."
            error={errors.portCode?.message}
            {...register("portCode")}
          />
          <Controller
            control={control}
            name="defaultRoute"
            render={({ field }) => (
              <SelectField
                label="Default export route"
                options={[
                  { value: "lut", label: "Under LUT, no GST" },
                  { value: "igst", label: "IGST paid, refund later" },
                ]}
                value={field.value}
                onValueChange={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="invoiceCurrency"
            render={({ field }) => (
              <SelectField
                label="Export invoice currency"
                options={[
                  { value: "INR", label: "Indian rupee (INR)" },
                  { value: "BTN", label: "Bhutanese ngultrum (BTN)" },
                ]}
                value={field.value}
                onValueChange={field.onChange}
              />
            )}
          />
        </div>
        {result && <FormMessage tone="success">{result}</FormMessage>}
        <div>
          <Button type="submit" disabled={!isDirty}>
            Save settings
          </Button>
        </div>
      </form>
    </GlassCard>
  );
}
