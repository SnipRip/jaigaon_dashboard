"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Button, buttonClasses } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterGroup } from "@/components/ui/filter-group";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { GST_TREATMENTS, needsGstin } from "@/features/gst/gst-rules";
import { checkGstin, gstinPan, gstinStateCode } from "@/features/gst/gstin";
import { INDIAN_STATES, stateName } from "@/features/gst/indian-states";
import { ROLE_TEXT, taxProfileOf } from "./party-rules";
import { partySchema, type PartyFormValues } from "./party-schema";
import { PartyTaxPreview } from "./party-tax-preview";
import type { Party, PartyRole } from "./types";

interface PartyFormProps {
  /** Which list the form was opened from; it is ticked for a new party. */
  role: PartyRole;
  party?: Party;
  priceLevels: string[];
  companyState: string;
}

const NONE = "__none";
const text = (value?: number) => (value === undefined ? "" : String(value));

function toValues(role: PartyRole, party?: Party): PartyFormValues {
  return {
    roles: party?.roles ?? [role],
    kind: party?.kind ?? "business",
    displayName: party?.displayName ?? "",
    legalName: party?.legalName ?? "",
    contactPerson: party?.contactPerson ?? "",
    phone: party?.phone ?? "",
    email: party?.email ?? "",
    treatment: party?.treatment ?? "registered",
    gstin: party?.gstin ?? "",
    pan: party?.pan ?? "",
    placeOfSupply: party?.placeOfSupply ?? "",
    country: party?.billing.country ?? "",
    foreignTaxId: party?.foreignTaxId ?? "",
    currency: party?.currency ?? "INR",
    exportRoute: party?.exportRoute ?? "lut",
    isGta: party?.isGta ?? false,
    addressLine: party?.billing.line1 ?? "",
    city: party?.billing.city ?? "",
    pin: party?.billing.pin ?? "",
    creditDays: text(party?.creditDays ?? 0),
    creditLimit: text(party?.creditLimit),
    priceLevel: party?.priceLevel ?? NONE,
    openingBalance: text(party?.openingBalance),
    udyamNumber: party?.udyamNumber ?? "",
    bankName: party?.bankAccount?.name ?? "",
    bankAccount: party?.bankAccount?.number ?? "",
    ifsc: party?.bankAccount?.ifsc ?? "",
    notes: party?.notes ?? "",
  };
}

// Zoho-style contact form for customers and vendors. GST treatment decides
// which fields show: a GSTIN fills in the state and PAN, an overseas party
// gets country, tax ID and export route instead of a place of supply.
export function PartyForm({ role, party, priceLevels, companyState }: PartyFormProps) {
  const [result, setResult] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PartyFormValues>({ resolver: zodResolver(partySchema), defaultValues: toValues(role, party) });

  const [roles, treatment, gstin, placeOfSupply, exportRoute, isGta] = useWatch({
    control,
    name: ["roles", "treatment", "gstin", "placeOfSupply", "exportRoute", "isGta"],
  });
  const isCustomer = roles.includes("customer");
  const isVendor = roles.includes("vendor");
  const overseas = treatment === "overseas";
  const gstinCheck = gstin ? checkGstin(gstin) : undefined;

  const onGstinChange = (value: string) => {
    const upper = value.toUpperCase();
    setValue("gstin", upper, { shouldDirty: true });
    if (checkGstin(upper).valid) {
      setValue("pan", gstinPan(upper), { shouldDirty: true });
      if (treatment !== "sez") setValue("placeOfSupply", gstinStateCode(upper), { shouldDirty: true, shouldValidate: true });
    }
  };

  const toggleRole = (toggled: PartyRole) =>
    setValue("roles", roles.includes(toggled) ? roles.filter((existing) => existing !== toggled) : [...roles, toggled], {
      shouldDirty: true,
      shouldValidate: true,
    });

  const onSubmit = handleSubmit(
    () => setResult({ tone: "success", text: "All fields check out. Saving switches on when this master is connected to the database." }),
    () => setResult({ tone: "error", text: "Some fields need attention. See the ones marked in red above." }),
  );

  const stateOptions = INDIAN_STATES.map((state) => ({ value: state.code, label: `${state.name} (${state.code})` }));

  return (
    <form onSubmit={onSubmit} noValidate className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="@container flex min-w-0 flex-col gap-3.5">
        <GlassCard className="flex flex-col gap-3.5">
          <CardTitle>Who they are</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted">This party is a</span>
            <FilterGroup label="This party is a">
              <FilterChip selected={isCustomer} onClick={() => toggleRole("customer")}>
                Customer
              </FilterChip>
              <FilterChip selected={isVendor} onClick={() => toggleRole("vendor")}>
                Vendor
              </FilterChip>
            </FilterGroup>
            {errors.roles && <span className="text-xs font-semibold text-danger-strong">{errors.roles.message}</span>}
          </div>
          <div className="grid gap-x-3.5 gap-y-3 @xl:grid-cols-2 @4xl:grid-cols-3">
            <TextField label="Display name" placeholder="Shown on quotations and invoices" error={errors.displayName?.message} {...register("displayName")} />
            <TextField label="Legal name" placeholder="As registered, if different" error={errors.legalName?.message} {...register("legalName")} />
            <TextField label="Contact person" error={errors.contactPerson?.message} {...register("contactPerson")} />
            <Controller
              control={control}
              name="kind"
              render={({ field }) => (
                <SelectField
                  label="Type"
                  options={[
                    { value: "business", label: "Business" },
                    { value: "individual", label: "Individual" },
                  ]}
                  value={field.value}
                  onValueChange={field.onChange}
                />
              )}
            />
            <TextField label="Mobile / WhatsApp" type="tel" placeholder="+919635312988" error={errors.phone?.message} {...register("phone")} />
            <TextField label="Email" type="email" error={errors.email?.message} {...register("email")} />
          </div>
        </GlassCard>

        <GlassCard className="flex flex-col gap-3.5">
          <CardTitle>GST and tax</CardTitle>
          <Controller
            control={control}
            name="treatment"
            render={({ field }) => (
              <div className="flex flex-col gap-1.5">
                <SelectField
                  label="GST treatment"
                  options={GST_TREATMENTS.map((option) => ({ value: option.value, label: option.label }))}
                  value={field.value}
                  onValueChange={field.onChange}
                />
                <p className="text-xs font-semibold text-muted">{GST_TREATMENTS.find((option) => option.value === field.value)?.hint}</p>
              </div>
            )}
          />

          {needsGstin(treatment) && (
            <div className="grid gap-x-3.5 gap-y-3 @xl:grid-cols-2 @4xl:grid-cols-3">
              <TextField
                label="GSTIN"
                placeholder="15 characters"
                maxLength={15}
                value={gstin}
                onChange={(event) => onGstinChange(event.target.value)}
                hint={gstinCheck?.valid ? `Valid · ${stateName(gstinStateCode(gstin))} · PAN filled in` : undefined}
                error={errors.gstin?.message}
              />
              <TextField label="PAN" error={errors.pan?.message} {...register("pan")} />
            </div>
          )}

          {overseas ? (
            <div className="grid gap-x-3.5 gap-y-3 @xl:grid-cols-2 @4xl:grid-cols-3">
              <TextField label="Country" placeholder="Bhutan" error={errors.country?.message} {...register("country")} />
              <TextField
                label="Their tax ID"
                placeholder="Bhutan TPN or equivalent"
                error={errors.foreignTaxId?.message}
                {...register("foreignTaxId")}
              />
              <Controller
                control={control}
                name="currency"
                render={({ field }) => (
                  <SelectField
                    label="Currency"
                    options={[
                      { value: "INR", label: "Indian rupee (INR)" },
                      { value: "BTN", label: "Bhutanese ngultrum (BTN)" },
                    ]}
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                )}
              />
              {isCustomer && (
                <Controller
                  control={control}
                  name="exportRoute"
                  render={({ field }) => (
                    <SelectField
                      label="Export route for this buyer"
                      options={[
                        { value: "lut", label: "Under LUT, no GST" },
                        { value: "igst", label: "IGST paid, refund later" },
                      ]}
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  )}
                />
              )}
            </div>
          ) : (
            <Controller
              control={control}
              name="placeOfSupply"
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <SelectField
                    label={needsGstin(treatment) && treatment !== "sez" ? "Place of supply · from the GSTIN" : "Place of supply"}
                    options={stateOptions}
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                    disabled={needsGstin(treatment) && treatment !== "sez" && Boolean(gstinCheck?.valid)}
                  />
                  {errors.placeOfSupply && <p className="text-xs font-semibold text-danger-strong">{errors.placeOfSupply.message}</p>}
                </div>
              )}
            />
          )}

          {isVendor && (
            <Controller
              control={control}
              name="isGta"
              render={({ field }) => (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted">Goods transport agency</span>
                  <FilterGroup label="Goods transport agency">
                    <FilterChip selected={!field.value} onClick={() => field.onChange(false)}>
                      No
                    </FilterChip>
                    <FilterChip selected={field.value} onClick={() => field.onChange(true)}>
                      Yes
                    </FilterChip>
                  </FilterGroup>
                  <p className="text-[11.5px] text-muted">Yes for truck transporters whose freight bills fall under reverse charge.</p>
                </div>
              )}
            />
          )}
        </GlassCard>

        <GlassCard className="flex flex-col gap-3.5">
          <CardTitle>Address</CardTitle>
          <div className="grid gap-3.5 @xl:grid-cols-[2fr_1fr_1fr]">
            <TextField label="Street / area" error={errors.addressLine?.message} {...register("addressLine")} />
            <TextField label="City / town" error={errors.city?.message} {...register("city")} />
            {!overseas && <TextField label="PIN code" inputMode="numeric" error={errors.pin?.message} {...register("pin")} />}
          </div>
          {!overseas && placeOfSupply && (
            <p className="text-xs font-semibold text-muted">State: {stateName(placeOfSupply)}, from the place of supply.</p>
          )}
        </GlassCard>

        <GlassCard className="flex flex-col gap-3.5">
          <CardTitle>Terms and balances</CardTitle>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
            <TextField label="Credit days" inputMode="numeric" hint="0 for cash" error={errors.creditDays?.message} {...register("creditDays")} />
            <TextField label="Opening balance (₹)" inputMode="decimal" error={errors.openingBalance?.message} {...register("openingBalance")} />
            {isCustomer && (
              <>
                <TextField label="Credit limit (₹)" inputMode="decimal" error={errors.creditLimit?.message} {...register("creditLimit")} />
                <Controller
                  control={control}
                  name="priceLevel"
                  render={({ field }) => (
                    <SelectField
                      label="Price level"
                      options={[{ value: NONE, label: "Standard rates" }, ...priceLevels.map((level) => ({ value: level, label: level }))]}
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  )}
                />
              </>
            )}
          </div>
          {isVendor && (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5 border-t border-line pt-4">
              <TextField
                label="Udyam (MSME) number"
                placeholder="UDYAM-WB-00-0000000"
                hint="MSME vendors must be paid within 45 days"
                error={errors.udyamNumber?.message}
                {...register("udyamNumber")}
              />
              <TextField label="Bank" error={errors.bankName?.message} {...register("bankName")} />
              <TextField label="Account number" inputMode="numeric" error={errors.bankAccount?.message} {...register("bankAccount")} />
              <TextField label="IFSC" error={errors.ifsc?.message} {...register("ifsc")} />
            </div>
          )}
          <TextField label="Notes" error={errors.notes?.message} {...register("notes")} />
        </GlassCard>

        <GlassCard className="flex flex-col gap-3">
          {result && <FormMessage tone={result.tone}>{result.text}</FormMessage>}
          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" size="lg">
              {party ? "Save changes" : `Save ${ROLE_TEXT[role].one}`}
            </Button>
            <Link href={ROLE_TEXT[role].path} className={buttonClasses("neutral", "ml-auto", "lg")}>
              Back to {ROLE_TEXT[role].many}
            </Link>
          </div>
        </GlassCard>
      </div>

      <div className="xl:sticky xl:top-3.5">
        <PartyTaxPreview
          companyState={companyState}
          roles={roles}
          profile={taxProfileOf({ treatment, placeOfSupply, exportRoute, isGta })}
        />
      </div>
    </form>
  );
}
