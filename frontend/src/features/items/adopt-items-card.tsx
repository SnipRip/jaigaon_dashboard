"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { SelectField } from "@/components/ui/select-field";
import { StatusChip } from "@/components/ui/status-chip";
import { itemLabel } from "./item-rules";
import type { GroupAttribute, Item } from "./types";

/** A standalone item to bring into the group, and the options it stands for. */
export interface AdoptedItem {
  itemId: string;
  values: Record<string, string>;
}

interface AdoptItemsCardProps {
  /** Items with no group, in the group's category. */
  candidates: Item[];
  attributes: GroupAttribute[];
  adopted: AdoptedItem[];
  /** Option combinations already taken by a saved variant or another adopted item. */
  isTaken: (values: Record<string, string>) => boolean;
  onChange: (adopted: AdoptedItem[]) => void;
}

// AAC blocks made one by one before the group existed can join it as
// variants: each keeps its stock, SKU and documents. Pick the item and the
// option it is; it saves with the group.
export function AdoptItemsCard({ candidates, attributes, adopted, isTaken, onChange }: AdoptItemsCardProps) {
  const [itemId, setItemId] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});

  const usable = attributes.filter((attribute) => attribute.name.trim() && attribute.options.length > 0);
  const free = candidates.filter((item) => !adopted.some((row) => row.itemId === item.id));
  const complete = usable.length > 0 && usable.every((attribute) => values[attribute.name]);
  const picked = Object.fromEntries(usable.map((attribute) => [attribute.name, values[attribute.name]]));
  const clash = complete && isTaken(picked);

  if (candidates.length === 0) return null;

  return (
    <GlassCard className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1">
        <CardTitle>Add items you already have</CardTitle>
        <p className="text-sm font-medium text-muted">
          Items created one at a time in this category can join the group as variants. Each keeps its stock, SKU and history.
        </p>
      </div>

      {adopted.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {adopted.map((row) => (
            <li key={row.itemId}>
              <StatusChip tone="brand">
                {candidates.find((item) => item.id === row.itemId)?.name} → {Object.values(row.values).join(" · ")}
                <button
                  type="button"
                  aria-label="Do not add this item"
                  onClick={() => onChange(adopted.filter((other) => other.itemId !== row.itemId))}
                  className="ml-1 inline-flex"
                >
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              </StatusChip>
            </li>
          ))}
        </ul>
      )}

      {free.length > 0 && usable.length > 0 && (
        <div className="grid items-end gap-2.5 md:grid-cols-[2fr_repeat(3,1fr)_auto]">
          <SelectField
            label="Item"
            options={free.map((item) => ({ value: item.id, label: itemLabel(item) }))}
            value={itemId || undefined}
            onValueChange={setItemId}
          />
          {usable.map((attribute) => (
            <SelectField
              key={attribute.name}
              label={attribute.name}
              options={attribute.options.map((option) => ({ value: option, label: option }))}
              value={values[attribute.name]}
              onValueChange={(option) => setValues({ ...values, [attribute.name]: option })}
            />
          ))}
          <Button
            variant="outline"
            disabled={!itemId || !complete || clash}
            onClick={() => {
              onChange([...adopted, { itemId, values: picked }]);
              setItemId("");
              setValues({});
            }}
          >
            <Plus aria-hidden="true" className="size-[18px]" />
            Add
          </Button>
        </div>
      )}
      {clash && <p className="text-xs font-semibold text-danger-strong">Another variant already has these options.</p>}
      {usable.length === 0 && <p className="text-xs font-medium text-muted">Add the attributes and their options first.</p>}
    </GlassCard>
  );
}
