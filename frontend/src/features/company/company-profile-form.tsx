"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { checkGstin, gstinPan, gstinStateCode } from "@/features/gst/gstin";
import { INDIAN_STATES, stateName } from "@/features/gst/indian-states";
import { saveErrorText } from "@/lib/api-client";
import { companyProfileSchema, type CompanyProfileValues } from "./company-profile-schema";

interface CompanyProfileFormProps {
  initial: CompanyProfileValues;
  /** Saves and returns the stored values, which the form then shows. */
  onSave: (values: CompanyProfileValues) => Promise<CompanyProfileValues>;
}

const stateOptions = INDIAN_STATES.map((state) => ({ value: state.code, label: `${state.name} (${state.code})` }));

const fieldGrid = "grid gap-x-3.5 gap-y-3 @xl:grid-cols-2 @4xl:grid-cols-3";
const sectionTitle = "text-xs font-semibold tracking-wide text-muted uppercase";

// Our own registration, address and export identifiers: what every
// quotation, invoice and shipping bill prints about us. Our state decides
// CGST + SGST or IGST on every document.
export function CompanyProfileForm({ initial, onSave }: CompanyProfileFormProps) {
  const [result, setResult] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<CompanyProfileValues>({ resolver: zodResolver(companyProfileSchema), defaultValues: initial });
  const [stateCode, gstin] = useWatch({ control, name: ["stateCode", "gstin"] });
  const gstinValid = Boolean(gstin) && checkGstin(gstin).valid;

  // A valid GSTIN gives our state and PAN.
  const onGstinChange = (value: string) => {
    const upper = value.toUpperCase();
    setValue("gstin", upper, { shouldDirty: true });
    if (checkGstin(upper).valid) {
      setValue("pan", gstinPan(upper), { shouldDirty: true });
      setValue("stateCode", gstinStateCode(upper), { shouldDirty: true, shouldValidate: true });
    }
  };

  const onSubmit = handleSubmit(
    async (values) => {
      setResult(null);
      try {
        reset(await onSave(values));
        setResult({ tone: "success", text: "Company profile saved." });
      } catch (error) {
        setResult({ tone: "error", text: saveErrorText(error) });
      }
    },
    () => setResult({ tone: "error", text: "Some fields need attention. See the ones marked in red above." }),
  );

  return (
    <GlassCard className="@container flex flex-col gap-3.5">
      <div className="flex flex-col gap-1">
        <CardTitle>Our registration</CardTitle>
        <p className="text-sm font-medium text-muted">
          Registered in {stateName(stateCode)} (state code {stateCode}). Sales inside {stateName(stateCode)} get CGST + SGST;
          everywhere else in India, IGST.
        </p>
      </div>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <section className="flex flex-col gap-3">
          <h3 className={sectionTitle}>Business</h3>
          <div className={fieldGrid}>
            <TextField label="Legal name" error={errors.legalName?.message} {...register("legalName")} />
            <TextField label="Trade name" placeholder="On documents, if different" error={errors.tradeName?.message} {...register("tradeName")} />
            <Controller
              control={control}
              name="stateCode"
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <SelectField
                    label={gstinValid ? "GST state · from the GSTIN" : "GST state"}
                    options={stateOptions}
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={gstinValid}
                  />
                  {errors.stateCode && <p className="text-xs font-semibold text-danger-strong">{errors.stateCode.message}</p>}
                </div>
              )}
            />
            <TextField
              label="Our GSTIN"
              placeholder="Still to come from the client"
              error={errors.gstin?.message}
              {...register("gstin")}
              onChange={(event) => onGstinChange(event.target.value)}
            />
            <TextField label="PAN" placeholder="Filled from the GSTIN" error={errors.pan?.message} {...register("pan")} />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className={sectionTitle}>Address and contacts</h3>
          <div className={fieldGrid}>
            <TextField label="Address" error={errors.addressLine?.message} {...register("addressLine")} />
            <TextField label="City / town" error={errors.city?.message} {...register("city")} />
            <TextField label="District" error={errors.district?.message} {...register("district")} />
            <TextField label="PIN code" inputMode="numeric" error={errors.pin?.message} {...register("pin")} />
            <TextField label="Phone" type="tel" placeholder="+919635312988" error={errors.phone?.message} {...register("phone")} />
            <TextField label="Second phone" type="tel" placeholder="+97577667493" error={errors.altPhone?.message} {...register("altPhone")} />
            <TextField label="Email" type="email" error={errors.email?.message} {...register("email")} />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className={sectionTitle}>Export</h3>
          <div className={fieldGrid}>
            <TextField label="IEC (Importer-Exporter Code)" placeholder="10 characters, from DGFT" error={errors.iec?.message} {...register("iec")} />
            <TextField label="Export payments bank" placeholder="Bank that receives export payments" error={errors.exportBank?.message} {...register("exportBank")} />
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
              name="defaultExportRoute"
              render={({ field }) => (
                <SelectField
                  label="Default export route"
                  options={[
                    { value: "LUT", label: "Under LUT, no GST" },
                    { value: "IGST", label: "IGST paid, refund later" },
                  ]}
                  value={field.value}
                  onValueChange={field.onChange}
                />
              )}
            />
            <Controller
              control={control}
              name="exportCurrency"
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
          <p className="text-xs font-medium text-muted">The AD code is issued every year, so it sits beside that year&apos;s LUT.</p>
        </section>

        {result && <FormMessage tone={result.tone} result={result}>{result.text}</FormMessage>}
        <div>
          <Button type="submit" disabled={!isDirty || isSubmitting}>
            {isSubmitting ? "Saving…" : "Save company profile"}
          </Button>
        </div>
      </form>
    </GlassCard>
  );
}
