"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftRight, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { Button, buttonClasses } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { SelectField } from "@/components/ui/select-field";
import { StatusChip } from "@/components/ui/status-chip";
import { TextField } from "@/components/ui/text-field";
import { Tooltip } from "@/components/ui/tooltip";
import { HsnSummary } from "@/features/hsn/hsn-summary";
import { ApiError } from "@/lib/api-client";
import { formatRate } from "@/lib/format";
import { InheritedField } from "./inherited-field";
import { ItemPictureField } from "./item-picture-field";
import { TodaysRateField } from "./todays-rate-field";
import { hasPictureChanges, NO_PICTURE_CHANGES, type PictureChanges } from "./item-picture-rules";
import { findGroup, resolveDefaults, resolveItemDefaults, type ItemCatalog } from "./item-rules";
import { itemSchema, type ItemFormValues } from "./item-schema";
import type { Item } from "./types";
import { NONE, OVERRIDE_FIELD, useOverrides, type Overridable } from "./use-overrides";

export interface ItemFormOptions {
  brands: string[];
  units: string[];
  godowns: string[];
  gstRates: number[];
}

interface ItemFormProps extends ItemFormOptions {
  catalog: ItemCatalog;
  /** The item being edited; a new item when absent. */
  item?: Item;
  /**
   * Saves through the backend, the pictures after the item; throws an ApiError
   * the form shows. `onPicturesLeft` gets the picture changes still to do, so a
   * retry after a failed upload repeats only what did not go through.
   */
  onSave: (
    values: ItemFormValues,
    overridden: ReadonlySet<Overridable>,
    pictures: PictureChanges,
    onPicturesLeft: (left: PictureChanges) => void,
  ) => Promise<void>;
}

export const saveErrorText = (error: unknown) =>
  error instanceof ApiError ? error.message : "Could not save. Check the connection and try again.";

const text = (value: number | undefined) => (value === undefined ? "" : String(value));

function toFormValues(item: Item | undefined, godowns: string[], currentHsn?: string): ItemFormValues {
  return {
    name: item?.name ?? "",
    sku: item?.sku ?? "",
    categoryId: item?.categoryId ?? "",
    subCategoryId: item?.subCategoryId ?? NONE,
    brand: item?.brand ?? NONE,
    description: item?.description ?? "",
    hsn: currentHsn ?? "",
    gstOverride: text(item?.overrides.gstRatePct),
    unitOverride: item?.overrides.unit ?? "",
    // Shown the natural way round: "1 bundle = 25 kg", not "1 kg = 0.04 bundle".
    alternateUnits: (item?.alternateUnits ?? []).map((conversion) => {
      const perBase = conversion.baseQuantity < 1;
      const quantity = perBase ? 1 / conversion.baseQuantity : conversion.baseQuantity;
      return { unit: conversion.unit, quantity: String(Number(quantity.toFixed(3))), perBase };
    }),
    weightKg: text(item?.weightKg),
    mrp: text(item?.mrp),
    preferredSupplier: item?.preferredSupplier ?? "",
    openingStock: godowns.map((godown) => ({ godown, quantity: "" })),
    openingRate: "",
    reorderLevel: text(item?.reorderLevel),
  };
}

// The item form, in Zoho's order: basics, units, tax, sales, purchase,
// inventory. HSN, GST rate and unit are inherited from the category tree and
// only stored on the item when it is changed here.
export function ItemForm({ catalog, item, brands, units, godowns, gstRates, onSave }: ItemFormProps) {
  const isNew = !item;
  const group = findGroup(catalog, item?.groupId);
  const overrides = useOverrides(item?.overrides);
  const { overridden } = overrides;
  const [result, setResult] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pictures, setPictures] = useState<PictureChanges>(NO_PICTURE_CHANGES);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isDirty: fieldsDirty, isSubmitting },
  } = useForm<ItemFormValues>({ resolver: zodResolver(itemSchema), defaultValues: toFormValues(item, godowns, item && resolveItemDefaults(catalog, item).hsn.value) });
  const alternateUnits = useFieldArray({ control, name: "alternateUnits" });
  const isDirty = fieldsDirty || hasPictureChanges(pictures);

  const [categoryId, subCategoryId, unitOverride, conversions, hsn, name] = useWatch({
    control,
    name: ["categoryId", "subCategoryId", "unitOverride", "alternateUnits", "hsn", "name"],
  });
  const category = catalog.categories.find((candidate) => candidate.id === categoryId);
  const place = { categoryId, subCategoryId: subCategoryId === NONE ? undefined : subCategoryId, groupId: item?.groupId };
  // What this item would get from above if it set nothing itself.
  // A changed HSN still counts, so the GST rate follows it from the master.
  // GST follows the HSN typed on this item; the category's HSN is only a suggestion.
  const suggestedHsn = resolveDefaults(catalog, place).hsn.value;
  const inherited = resolveDefaults(catalog, place, { hsn: hsn || undefined });
  const baseUnit = (overridden.has("unit") && unitOverride) || inherited.unit.value || "unit";

  // HSN is the item's own field here, so only GST rate and unit are overrides.
  const override = (key: Exclude<Overridable, "hsn">) => {
    overrides.add(key);
    setValue(OVERRIDE_FIELD[key], String(inherited[key].value ?? ""), { shouldDirty: true });
  };
  const resetOverride = (key: Exclude<Overridable, "hsn">) => {
    overrides.remove(key);
    setValue(OVERRIDE_FIELD[key], "", { shouldDirty: true });
  };

  const onSubmit = handleSubmit(
    async (values) => {
      setResult(null);
      try {
        await onSave(values, overridden, pictures, setPictures);
        // The saved values become the new starting point for "Discard changes".
        reset(values);
        setPictures(NO_PICTURE_CHANGES);
        setResult({ tone: "success", text: `${values.name} saved.` });
      } catch (error) {
        setResult({ tone: "error", text: saveErrorText(error) });
      }
    },
    () => setResult({ tone: "error", text: "Some fields need attention. See the ones marked in red above." }),
  );

  const categoryOptions = catalog.categories.map((candidate) => ({ value: candidate.id, label: candidate.name }));
  const subCategoryOptions = [
    { value: NONE, label: category?.subCategories.length ? "None" : "No sub-categories" },
    ...(category?.subCategories ?? []).map((sub) => ({ value: sub.id, label: sub.name })),
  ];
  const unitOptions = units.map((unit) => ({ value: unit, label: unit }));

  return (
    <form onSubmit={onSubmit} noValidate className="@container flex min-w-0 flex-col gap-3.5">
      <GlassCard className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Basics</CardTitle>
          {group && (
            <StatusChip tone="brand">
              Variant of{" "}
              <Link href={`/items/groups/${group.id}`} className="underline">
                {group.name}
              </Link>
            </StatusChip>
          )}
        </div>
        <div className="grid gap-3.5 @xl:grid-cols-2">
          <TextField label="Item name" placeholder="TMT Bar Fe 600 12 mm" error={errors.name?.message} {...register("name")} />
          <TextField label="SKU / code" placeholder="IS-TMT-12" error={errors.sku?.message} {...register("sku")} />
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <div className="flex flex-col gap-1.5">
                <SelectField
                  label={group ? "Category · set by the item group" : "Category"}
                  options={categoryOptions}
                  value={field.value || undefined}
                  onValueChange={(value) => {
                    field.onChange(value);
                    setValue("subCategoryId", NONE);
                  }}
                  disabled={Boolean(group)}
                />
                {errors.categoryId && <p className="text-xs font-semibold text-danger-strong">{errors.categoryId.message}</p>}
              </div>
            )}
          />
          <Controller
            control={control}
            name="subCategoryId"
            render={({ field }) => (
              <SelectField
                label={group ? "Sub-category · set by the item group" : "Sub-category"}
                options={subCategoryOptions}
                value={field.value}
                onValueChange={field.onChange}
                disabled={Boolean(group) || !category || category.subCategories.length === 0}
              />
            )}
          />
          <Controller
            control={control}
            name="brand"
            render={({ field }) => (
              <SelectField
                label="Brand"
                options={[{ value: NONE, label: "No brand" }, ...brands.map((brand) => ({ value: brand, label: brand }))]}
                value={field.value}
                onValueChange={field.onChange}
              />
            )}
          />
          <TextField label="Description" placeholder="Grade, make, length" error={errors.description?.message} {...register("description")} />
        </div>
        <ItemPictureField name={name} stored={item?.pictures ?? []} changes={pictures} onChange={setPictures} />
        {group && item?.attributeValues && (
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted">
            Attributes:
            {Object.entries(item.attributeValues).map(([name, value]) => (
              <StatusChip key={name} tone="neutral">
                {name}: {value}
              </StatusChip>
            ))}
          </div>
        )}
      </GlassCard>

      <div className="grid items-start gap-3.5 @4xl:grid-cols-2">
        <GlassCard className="flex flex-col gap-3.5">
          <CardTitle>Units</CardTitle>
          <InheritedField
            label="Base unit (stock is counted in this)"
            inherited={inherited.unit}
            overridden={overridden.has("unit")}
            onOverride={() => override("unit")}
            onReset={() => resetOverride("unit")}
          >
            <Controller
              control={control}
              name="unitOverride"
              render={({ field }) => (
                <SelectField label="Base unit (stock is counted in this)" options={unitOptions} value={field.value || undefined} onValueChange={field.onChange} />
              )}
            />
          </InheritedField>

          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-medium text-muted">Other units this item is bought or sold in</span>
            {alternateUnits.fields.map((field, index) => {
              const row = conversions?.[index];
              const unitPicker = (
                <Controller
                  control={control}
                  name={`alternateUnits.${index}.unit`}
                  render={({ field: unitField }) => (
                    <SelectField
                      label={row?.perBase ? "of this unit" : "1 of this unit"}
                      options={unitOptions}
                      value={unitField.value || undefined}
                      onValueChange={unitField.onChange}
                    />
                  )}
                />
              );
              const quantityField = (
                <TextField
                  label={row?.perBase ? `1 ${baseUnit} =` : `= how many ${baseUnit}`}
                  inputMode="decimal"
                  error={errors.alternateUnits?.[index]?.quantity?.message}
                  {...register(`alternateUnits.${index}.quantity`)}
                />
              );
              return (
                <div key={field.id} className="flex flex-col gap-1">
                  <div className="grid grid-cols-[1fr_1fr_auto_auto] items-end gap-2">
                    {row?.perBase ? quantityField : unitPicker}
                    {row?.perBase ? unitPicker : quantityField}
                    <Tooltip label="Swap which side is 1">
                      <Button
                        variant="neutral"
                        aria-label="Swap which side is 1"
                        onClick={() => setValue(`alternateUnits.${index}.perBase`, !row?.perBase, { shouldDirty: true })}
                        className="w-11 px-0"
                      >
                        <ArrowLeftRight aria-hidden="true" className="size-[18px]" />
                      </Button>
                    </Tooltip>
                    <Button variant="neutral" aria-label="Remove this unit" onClick={() => alternateUnits.remove(index)} className="w-11 px-0">
                      <Trash2 aria-hidden="true" className="size-[18px]" />
                    </Button>
                  </div>
                  {row?.unit && Number(row.quantity) > 0 && (
                    <p className="pl-1 text-xs font-semibold text-brand-strong">
                      {row.perBase ? `1 ${baseUnit} = ${row.quantity} ${row.unit}` : `1 ${row.unit} = ${row.quantity} ${baseUnit}`}
                    </p>
                  )}
                </div>
              );
            })}
            <Button
              variant="outline"
              onClick={() => alternateUnits.append({ unit: "", quantity: "", perBase: false })}
              className="self-start"
            >
              <Plus aria-hidden="true" className="size-[18px]" />
              Add a unit
            </Button>
          </div>

          <TextField
            label={`Weight per ${baseUnit} (kg)`}
            inputMode="decimal"
            hint="Used for truck load and e-way bill weight"
            error={errors.weightKg?.message}
            {...register("weightKg")}
          />
        </GlassCard>

        <GlassCard className="flex flex-col gap-3.5">
          <CardTitle>Tax</CardTitle>
          <div className="flex flex-col gap-1.5">
            <TextField
              label="HSN code of this item"
              inputMode="numeric"
              maxLength={8}
              placeholder="8 digits for exports"
              error={errors.hsn?.message}
              {...register("hsn")}
            />
            {suggestedHsn && suggestedHsn !== hsn && (
              <button
                type="button"
                onClick={() => setValue("hsn", suggestedHsn, { shouldDirty: true, shouldValidate: true })}
                className="self-start text-xs font-semibold text-brand hover:underline"
              >
                Use {suggestedHsn}, suggested by the sub-category
              </button>
            )}
          </div>
          <InheritedField
            label="GST rate"
            inherited={inherited.gstRatePct}
            format={(value) => `${value}%`}
            overridden={overridden.has("gstRatePct")}
            onOverride={() => override("gstRatePct")}
            onReset={() => resetOverride("gstRatePct")}
          >
            <Controller
              control={control}
              name="gstOverride"
              render={({ field }) => (
                <SelectField
                  label="GST rate"
                  options={gstRates.map((rate) => ({ value: String(rate), label: `${rate}%` }))}
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                />
              )}
            />
          </InheritedField>
          {catalog.hsnCodes && <HsnSummary codes={catalog.hsnCodes} code={hsn || undefined} />}
          <p className="text-xs font-semibold text-muted">
            CGST + SGST or IGST is decided on each invoice from the place of supply. Bhutan exports under LUT carry no GST.
          </p>
        </GlassCard>
      </div>

      <div className="grid items-start gap-3.5 @4xl:grid-cols-2">
        <GlassCard className="flex flex-col gap-3.5">
          <CardTitle>Sales</CardTitle>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3.5">
            <TextField label="MRP (₹)" inputMode="decimal" hint="As printed on the goods" error={errors.mrp?.message} {...register("mrp")} />
            {!isNew && <TodaysRateField itemId={item.id} unit={baseUnit} />}
          </div>
          <p className="text-xs font-semibold text-muted">
            The item has no fixed selling price: the day&rsquo;s rate comes from the{" "}
            <Link href="/price-list" className="text-brand hover:underline">
              rate sheet
            </Link>
            , and a customer&rsquo;s special rate (Rates) comes before it. Prices are before GST.
          </p>
        </GlassCard>

        <GlassCard className="flex flex-col gap-3.5">
          <CardTitle>Purchase</CardTitle>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3.5">
            {!isNew && (
              <>
                <TextField label={`Last landed cost per ${baseUnit}`} value={costText(item.lastLandedCost)} disabled readOnly />
                <TextField label={`Stock cost per ${baseUnit} (FIFO)`} value={costText(item.stockCost)} disabled readOnly />
              </>
            )}
            <TextField label="Preferred supplier" placeholder="Hind Steel, Durgapur" error={errors.preferredSupplier?.message} {...register("preferredSupplier")} />
          </div>
          <p className="text-xs font-semibold text-muted">
            Cost is not entered here. Each purchase is its own batch: the bill rate plus its share of freight, unloading and GST
            that cannot be claimed. Stock is valued batch by batch, first in, first out.
          </p>
        </GlassCard>
      </div>

      <GlassCard className="flex flex-col gap-3.5">
        <CardTitle>Inventory</CardTitle>
        <div className="grid gap-3.5 @2xl:grid-cols-3">
          {isNew ? (
            [...godowns.map((godown, index) => (
              <TextField
                key={godown}
                label={`Opening stock · ${godown} (${baseUnit})`}
                inputMode="decimal"
                placeholder="0"
                error={errors.openingStock?.[index]?.quantity?.message}
                {...register(`openingStock.${index}.quantity`)}
              />
            )),
            <TextField
              key="opening-rate"
              label={`Opening rate per ${baseUnit} (₹)`}
              inputMode="decimal"
              hint="Landed cost of the opening stock"
              error={errors.openingRate?.message}
              {...register("openingRate")}
            />]
          ) : (
            <TextField label={`In stock (${baseUnit})`} value={item.stock} disabled readOnly hint="Changes through purchases, sales and stock adjustments" />
          )}
          <TextField
            label={`Reorder level (${baseUnit})`}
            inputMode="decimal"
            hint="Flagged as low stock at or below this"
            error={errors.reorderLevel?.message}
            {...register("reorderLevel")}
          />
        </div>
      </GlassCard>

      <GlassCard className="flex flex-col gap-3">
        {result && <FormMessage tone={result.tone}>{result.text}</FormMessage>}
        <div className="flex flex-wrap gap-2.5">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : isNew ? "Save item" : "Save changes"}
          </Button>
          <Button
            variant="neutral"
            size="lg"
            disabled={!isDirty}
            onClick={() => {
              reset();
              setPictures(NO_PICTURE_CHANGES);
              setResult(null);
              overrides.restore();
            }}
          >
            Discard changes
          </Button>
          <Link href="/items" className={buttonClasses("neutral", "ml-auto", "lg")}>
            Back to items
          </Link>
        </div>
      </GlassCard>
    </form>
  );
}

const costText = (cost: number | undefined) => (cost === undefined ? "No stock yet" : formatRate(cost));
