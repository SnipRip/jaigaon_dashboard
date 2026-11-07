"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Barcode, Plus, Trash2, Wand2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { Button, buttonClasses } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { InheritedField } from "./inherited-field";
import { itemGroupSchema, variantRowSchema, type ItemGroupFormValues, type VariantRow } from "./item-group-schema";
import { AdoptItemsCard, type AdoptedItem } from "./adopt-items-card";
import { generateVariants, resolveDefaults, resolveItemDefaults, variantName, type ItemCatalog } from "./item-rules";
import { SkuPatternDialog } from "./sku-pattern-dialog";
import { skuFromPattern, uniqueSku, type SkuPattern } from "./sku-rules";
import { saveErrorText, type ItemFormOptions } from "./item-form";
import { OptionsInput } from "./options-input";
import type { Item, ItemGroup } from "./types";
import { NONE, OVERRIDE_FIELD, useOverrides, type Overridable } from "./use-overrides";
import { VariantRowsTable, type VariantLine } from "./variant-rows-table";

interface ItemGroupFormProps extends Omit<ItemFormOptions, "godowns"> {
  catalog: ItemCatalog;
  /** The group being edited; a new group when absent. */
  group?: ItemGroup;
  /** Saves the group and its variant rows; throws an ApiError the form shows. */
  onSave: (values: ItemGroupFormValues, overridden: ReadonlySet<Overridable>, lines: VariantLine[]) => Promise<void>;
}

// Sorted by attribute name: the database does not keep the keys' order.
const variantKey = (values: Record<string, string>) =>
  JSON.stringify(Object.keys(values).sort().map((name) => [name, values[name]]));
const text = (value: number | undefined) => (value === undefined ? "" : String(value));

function rowFromItem(item: Item): VariantRow {
  return {
    sku: item.sku ?? "",
    openingStock: "",
    openingRate: "",
    reorderLevel: text(item.reorderLevel),
  };
}

// Zoho-style item group: shared details once, attributes with their options,
// and a generated row per combination. Each row becomes an item that holds
// its own stock and can be edited on its own afterwards.
export function ItemGroupForm({ catalog, group, brands, units, gstRates, onSave }: ItemGroupFormProps) {
  const isNew = !group;
  const existingVariants = group ? catalog.items.filter((item) => item.groupId === group.id) : [];
  const overrides = useOverrides(group?.defaults);
  const { overridden } = overrides;
  const [edits, setEdits] = useState<Record<string, Partial<VariantRow>>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, VariantLine["errors"]>>({});
  const [bulk, setBulk] = useState({ openingRate: "", reorderLevel: "" });
  const [adopted, setAdopted] = useState<AdoptedItem[]>([]);
  const [skuDialogOpen, setSkuDialogOpen] = useState(false);
  const [result, setResult] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ItemGroupFormValues>({
    resolver: zodResolver(itemGroupSchema),
    defaultValues: {
      name: group?.name ?? "",
      skuPrefix: group?.skuPrefix ?? "",
      categoryId: group?.categoryId ?? "",
      subCategoryId: group?.subCategoryId ?? NONE,
      brand: group?.brand ?? NONE,
      description: group?.description ?? "",
      hsnOverride: group?.defaults.hsn ?? "",
      gstOverride: text(group?.defaults.gstRatePct),
      unitOverride: group?.defaults.unit ?? "",
      attributes: group?.attributes ?? [{ name: "Size", options: [] }],
    },
  });
  const attributeFields = useFieldArray({ control, name: "attributes" });

  const [name, skuPrefix, categoryId, subCategoryId, unitOverride, attributes, hsnOverride] = useWatch({
    control,
    name: ["name", "skuPrefix", "categoryId", "subCategoryId", "unitOverride", "attributes", "hsnOverride"],
  });
  const category = catalog.categories.find((candidate) => candidate.id === categoryId);
  const inherited = resolveDefaults(
    catalog,
    { categoryId, subCategoryId: subCategoryId === NONE ? undefined : subCategoryId },
    { hsn: overridden.has("hsn") ? hsnOverride : undefined },
  );
  const unit = (overridden.has("unit") && unitOverride) || inherited.unit.value || "unit";

  // Standalone items in this placement that may join the group (adopt-items-card.tsx).
  const candidates = catalog.items.filter(
    (item) => !item.groupId && item.categoryId === categoryId && (item.subCategoryId ?? NONE) === (subCategoryId ?? NONE),
  );
  const adoptedOf = new Map(adopted.map((row) => [variantKey(row.values), catalog.items.find((item) => item.id === row.itemId)]));

  const lines: VariantLine[] = generateVariants(attributes ?? []).map((values) => {
    const key = variantKey(values);
    const saved = existingVariants.find((item) => variantKey(item.attributeValues ?? {}) === key);
    const joining = saved ? undefined : adoptedOf.get(key);
    const existing = saved ?? joining;
    const base: VariantRow = existing ? rowFromItem(existing) : { sku: "", openingStock: "", openingRate: "", reorderLevel: "" };
    return {
      key,
      values,
      name: variantName(name ?? "", values),
      existing,
      adopting: Boolean(joining),
      // A joining item keeps its own unit (the backend pins it).
      unit: joining ? resolveItemDefaults(catalog, joining).unit.value : undefined,
      row: { ...base, ...edits[key] },
      errors: rowErrors[key],
    };
  });

  // Fills the rows' SKUs from the pattern; a SKU any other item has is numbered.
  const applySkuPattern = (pattern: SkuPattern, replace: boolean) => {
    const own = new Set(lines.map((line) => line.existing?.id).filter(Boolean));
    const taken = new Set(catalog.items.filter((item) => item.sku && !own.has(item.id)).map((item) => item.sku!.toUpperCase()));
    const editable = lines.filter((line) => !line.adopting);
    const keep = (line: VariantLine) => !replace && line.row.sku.trim() !== "";
    for (const line of editable) if (keep(line)) taken.add(line.row.sku.trim().toUpperCase());
    setEdits((current) => {
      const next = { ...current };
      for (const line of editable) {
        if (keep(line)) continue;
        next[line.key] = { ...next[line.key], sku: uniqueSku(skuFromPattern(pattern, name ?? "", line.values), taken) };
      }
      return next;
    });
  };

  const editRow = (key: string, field: keyof VariantRow, value: string) =>
    setEdits((current) => ({ ...current, [key]: { ...current[key], [field]: value } }));

  const fillAll = () =>
    setEdits((current) => {
      const next = { ...current };
      for (const line of lines) {
        const filled = Object.fromEntries(Object.entries(bulk).filter(([, value]) => value.trim() !== ""));
        next[line.key] = { ...next[line.key], ...filled };
      }
      return next;
    });

  const override = (key: Overridable) => {
    overrides.add(key);
    setValue(OVERRIDE_FIELD[key], String(inherited[key].value ?? ""), { shouldDirty: true });
  };
  const resetOverride = (key: Overridable) => {
    overrides.remove(key);
    setValue(OVERRIDE_FIELD[key], "", { shouldDirty: true });
  };

  const onSubmit = handleSubmit(async (values) => {
    const found: Record<string, VariantLine["errors"]> = {};
    for (const line of lines) {
      const check = variantRowSchema.safeParse(line.row);
      if (!check.success) {
        found[line.key] = Object.fromEntries(check.error.issues.map((issue) => [issue.path[0], issue.message]));
      }
    }
    // Blank SKUs are allowed; a filled one must be unique among the rows.
    const skus = lines.map((line) => (line.adopting ? "" : line.row.sku.trim().toUpperCase()));
    lines.forEach((line, index) => {
      if (skus[index] && skus.indexOf(skus[index]) !== index) found[line.key] = { ...found[line.key], sku: "This SKU is used twice" };
    });
    setRowErrors(found);
    const problems = Object.keys(found).length;
    if (problems > 0) {
      setResult({ tone: "error", text: `${problems} ${problems === 1 ? "variant needs" : "variants need"} attention. See the rows marked in red.` });
      return;
    }
    setResult(null);
    try {
      await onSave(values, overridden, lines);
      setEdits({});
      setAdopted([]);
      setResult({ tone: "success", text: `${values.name} saved with ${lines.length} ${lines.length === 1 ? "variant" : "variants"}.` });
    } catch (error) {
      setResult({ tone: "error", text: saveErrorText(error) });
    }
  }, () => setResult({ tone: "error", text: "Some group details need attention. See the fields marked in red above." }));

  const unitOptions = units.map((option) => ({ value: option, label: option }));

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3.5">
      <div className="grid items-start gap-3.5 xl:grid-cols-[3fr_2fr]">
        <GlassCard className="flex flex-col gap-3.5">
          <CardTitle>Group details</CardTitle>
          <div className="grid gap-3.5 md:grid-cols-2">
            <TextField label="Group name" placeholder="TMT Bar Fe 600" error={errors.name?.message} {...register("name")} />
            <TextField
              label="SKU prefix (optional)"
              placeholder="IS-TMT"
              hint="Offered as a part when you generate SKUs"
              error={errors.skuPrefix?.message}
              {...register("skuPrefix")}
            />
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <SelectField
                    label="Category"
                    options={catalog.categories.map((candidate) => ({ value: candidate.id, label: candidate.name }))}
                    value={field.value || undefined}
                    onValueChange={(value) => {
                      field.onChange(value);
                      setValue("subCategoryId", NONE);
                    }}
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
                  label="Sub-category"
                  options={[
                    { value: NONE, label: category?.subCategories.length ? "None" : "No sub-categories" },
                    ...(category?.subCategories ?? []).map((sub) => ({ value: sub.id, label: sub.name })),
                  ]}
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!category || category.subCategories.length === 0}
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
        </GlassCard>

        <GlassCard className="flex flex-col gap-3.5">
          <CardTitle>Shared by every variant</CardTitle>
          <InheritedField
            label="Base unit"
            levelName="item group"
            inherited={inherited.unit}
            overridden={overridden.has("unit")}
            onOverride={() => override("unit")}
            onReset={() => resetOverride("unit")}
          >
            <Controller
              control={control}
              name="unitOverride"
              render={({ field }) => (
                <SelectField label="Base unit" options={unitOptions} value={field.value || undefined} onValueChange={field.onChange} />
              )}
            />
          </InheritedField>
          <InheritedField
            label="HSN code"
            levelName="item group"
            inherited={inherited.hsn}
            overridden={overridden.has("hsn")}
            onOverride={() => override("hsn")}
            onReset={() => resetOverride("hsn")}
          >
            <TextField label="HSN code" inputMode="numeric" error={errors.hsnOverride?.message} {...register("hsnOverride")} />
          </InheritedField>
          <InheritedField
            label="GST rate"
            levelName="item group"
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
        </GlassCard>
      </div>

      <GlassCard className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1">
          <CardTitle>Attributes</CardTitle>
          <p className="text-sm font-medium text-muted">
            What the variants differ by: size, thickness, gauge, class, colour. Up to three attributes.
          </p>
        </div>
        {attributeFields.fields.map((field, index) => (
          <div key={field.id} className="grid items-start gap-2.5 md:grid-cols-[220px_1fr_auto]">
            <TextField label="Attribute" placeholder="Size" error={errors.attributes?.[index]?.name?.message} {...register(`attributes.${index}.name`)} />
            <Controller
              control={control}
              name={`attributes.${index}.options`}
              render={({ field: optionsField }) => (
                <OptionsInput
                  label="Options · press Enter after each"
                  placeholder="8 mm, 10 mm, 12 mm"
                  options={optionsField.value}
                  onChange={optionsField.onChange}
                  error={errors.attributes?.[index]?.options?.message}
                />
              )}
            />
            <Button
              variant="neutral"
              aria-label="Remove this attribute"
              disabled={attributeFields.fields.length === 1}
              onClick={() => attributeFields.remove(index)}
              className="w-11 px-0 md:mt-[22px]"
            >
              <Trash2 aria-hidden="true" className="size-[18px]" />
            </Button>
          </div>
        ))}
        {errors.attributes?.root && <p className="text-xs font-semibold text-danger-strong">{errors.attributes.root.message}</p>}
        <Button
          variant="outline"
          disabled={attributeFields.fields.length >= 3}
          onClick={() => attributeFields.append({ name: "", options: [] })}
          className="self-start"
        >
          <Plus aria-hidden="true" className="size-[18px]" />
          Add an attribute
        </Button>
      </GlassCard>

      <GlassCard className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>Variants · {lines.length}</CardTitle>
            <p className="text-sm font-medium text-muted">Opening rates are per {unit}. Selling rates come from the rate sheet. Every field can differ per variant.</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            {(
              [
                ["openingRate", "Opening rate for all"],
                ["reorderLevel", "Reorder for all"],
              ] as const
            ).map(([field, label]) => (
              <div key={field} className="w-[120px]">
                <TextField
                  label={label}
                  inputMode="decimal"
                  value={bulk[field]}
                  onChange={(event) => setBulk({ ...bulk, [field]: event.target.value })}
                />
              </div>
            ))}
            <Button variant="outline" onClick={fillAll} disabled={lines.length === 0}>
              <Wand2 aria-hidden="true" className="size-[18px]" />
              Fill all variants
            </Button>
            <Button variant="outline" onClick={() => setSkuDialogOpen(true)} disabled={lines.length === 0 || !name?.trim()}>
              <Barcode aria-hidden="true" className="size-[18px]" />
              Generate SKUs
            </Button>
          </div>
        </div>
        <VariantRowsTable lines={lines} unit={unit} onChange={editRow} />
        {!isNew && (
          <p className="text-xs font-semibold text-muted">
            New options add variants. An option a variant already uses cannot be removed; archive that variant from its item page
            first.
          </p>
        )}
        {skuDialogOpen && (
          <SkuPatternDialog
            open
            onOpenChange={setSkuDialogOpen}
            groupName={name ?? ""}
            skuPrefix={skuPrefix?.trim() ?? ""}
            attributes={(attributes ?? []).map((attribute) => attribute.name).filter(Boolean)}
            sample={lines[0]?.values ?? {}}
            onApply={applySkuPattern}
          />
        )}
      </GlassCard>

      <AdoptItemsCard
        candidates={candidates}
        attributes={attributes ?? []}
        adopted={adopted}
        isTaken={(values) => {
          const key = variantKey(values);
          return existingVariants.some((item) => variantKey(item.attributeValues ?? {}) === key) || adoptedOf.has(key);
        }}
        onChange={setAdopted}
      />

      <GlassCard className="flex flex-col gap-3">
        {result && <FormMessage tone={result.tone}>{result.text}</FormMessage>}
        <div className="flex flex-wrap gap-2.5">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting
              ? "Saving…"
              : isNew
                ? `Create group with ${lines.length} ${lines.length === 1 ? "variant" : "variants"}`
                : "Save changes"}
          </Button>
          <Link href="/items" className={buttonClasses("neutral", "ml-auto", "lg")}>
            Back to items
          </Link>
        </div>
      </GlassCard>
    </form>
  );
}
