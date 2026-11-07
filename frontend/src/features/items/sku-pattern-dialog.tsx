"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassModal } from "@/components/ui/glass-modal";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { defaultGroupPattern, SKU_SEPARATORS, skuFromPattern, type SkuPart, type SkuPattern, type SkuSeparator } from "./sku-rules";

interface SkuPatternDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupName: string;
  /** The group's SKU prefix, offered as a part when set. */
  skuPrefix: string;
  attributes: string[];
  /** The first variant's values, for the preview. */
  sample: Record<string, string>;
  /** Fills the variants' SKUs; `replace` also overwrites SKUs already typed. */
  onApply: (pattern: SkuPattern, replace: boolean) => void;
}

const SOURCE_NAME = "name";
const SOURCE_PREFIX = "prefix";
const SOURCE_TEXT = "text";
const attributeSource = (attribute: string) => `attribute:${attribute}`;

const sourceKey = (part: SkuPart) => (part.source.kind === "attribute" ? attributeSource(part.source.attribute) : part.source.kind);

const LETTER_OPTIONS = [
  { value: "0", label: "All letters" },
  ...[1, 2, 3, 4, 5].map((count) => ({ value: String(count), label: `First ${count}` })),
];

// Zoho's "Generate SKU": pick the parts (group name, each attribute, fixed
// text), how many letters of each to show, a separator and the letter case,
// see the first variant's SKU, then fill every variant at once.
export function SkuPatternDialog({ open, onOpenChange, groupName, skuPrefix, attributes, sample, onApply }: SkuPatternDialogProps) {
  const [pattern, setPattern] = useState<SkuPattern>(() => defaultGroupPattern(attributes));
  const [replace, setReplace] = useState(false);

  const sourceOptions = [
    { value: SOURCE_NAME, label: "Group name" },
    ...(skuPrefix ? [{ value: SOURCE_PREFIX, label: `SKU prefix (${skuPrefix})` }] : []),
    ...attributes.map((attribute) => ({ value: attributeSource(attribute), label: attribute })),
    { value: SOURCE_TEXT, label: "Custom text" },
  ];

  const setPart = (index: number, part: SkuPart) =>
    setPattern((current) => ({ ...current, parts: current.parts.map((existing, at) => (at === index ? part : existing)) }));

  const changeSource = (index: number, key: string) => {
    const letters = pattern.parts[index].letters;
    if (key === SOURCE_NAME) setPart(index, { source: { kind: "name" }, letters });
    else if (key === SOURCE_PREFIX) setPart(index, { source: { kind: "text", text: skuPrefix }, letters: 0 });
    else if (key === SOURCE_TEXT) setPart(index, { source: { kind: "text", text: "" }, letters: 0 });
    else setPart(index, { source: { kind: "attribute", attribute: key.slice("attribute:".length) }, letters });
  };

  const preview = skuFromPattern(pattern, groupName, sample);

  return (
    <GlassModal
      open={open}
      onOpenChange={onOpenChange}
      title="Generate SKUs"
      description="Build the pattern once; every variant gets its own SKU. A SKU already taken gets -2, -3 added."
      footer={
        <>
          <Button variant="neutral" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!preview}
            onClick={() => {
              onApply(pattern, replace);
              onOpenChange(false);
            }}
          >
            Generate SKUs
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2.5">
        {pattern.parts.map((part, index) => (
          <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
            <SelectField
              label={`Part ${index + 1}`}
              options={sourceOptions}
              value={part.source.kind === "text" && part.source.text === skuPrefix && skuPrefix ? SOURCE_PREFIX : sourceKey(part)}
              onValueChange={(key) => changeSource(index, key)}
            />
            {part.source.kind === "text" ? (
              <TextField
                label="Text"
                value={part.source.text}
                maxLength={20}
                onChange={(event) => setPart(index, { source: { kind: "text", text: event.target.value }, letters: 0 })}
              />
            ) : (
              <SelectField
                label="Show"
                options={LETTER_OPTIONS}
                value={String(part.letters)}
                onValueChange={(value) => setPart(index, { ...part, letters: Number(value) })}
              />
            )}
            <Button
              variant="neutral"
              aria-label={`Remove part ${index + 1}`}
              disabled={pattern.parts.length === 1}
              onClick={() => setPattern((current) => ({ ...current, parts: current.parts.filter((_, at) => at !== index) }))}
              className="w-11 px-0"
            >
              <Trash2 aria-hidden="true" className="size-[18px]" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          className="self-start"
          disabled={pattern.parts.length >= 6}
          onClick={() => setPattern((current) => ({ ...current, parts: [...current.parts, { source: { kind: "text", text: "" }, letters: 0 }] }))}
        >
          <Plus aria-hidden="true" className="size-[18px]" />
          Add a part
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SelectField
          label="Separator"
          options={SKU_SEPARATORS.map((separator) => ({ value: separator, label: separator }))}
          value={pattern.separator}
          onValueChange={(value) => setPattern((current) => ({ ...current, separator: value as SkuSeparator }))}
        />
        <SelectField
          label="Letter case"
          options={[
            { value: "upper", label: "UPPERCASE" },
            { value: "lower", label: "lowercase" },
          ]}
          value={pattern.letterCase}
          onValueChange={(value) => setPattern((current) => ({ ...current, letterCase: value as SkuPattern["letterCase"] }))}
        />
      </div>

      <label className="flex items-center gap-2 text-[13px] font-medium">
        <input type="checkbox" checked={replace} onChange={(event) => setReplace(event.target.checked)} className="size-4 accent-brand" />
        Replace SKUs already filled in
      </label>

      <div className="glass-inset flex items-center justify-between gap-3 rounded-(--radius-tile) px-3 py-2.5">
        <span className="text-xs font-medium text-muted">First variant</span>
        <span className="truncate font-mono text-[13px] font-semibold">{preview || "–"}</span>
      </div>
    </GlassModal>
  );
}
