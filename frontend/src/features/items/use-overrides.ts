import { useState } from "react";
import type { ItemDefaults } from "./types";

/** Radix Select cannot hold an empty value, so "none" gets this placeholder. */
export const NONE = "__none";

export const OVERRIDABLE = ["hsn", "gstRatePct", "unit"] as const satisfies (keyof ItemDefaults)[];
export type Overridable = (typeof OVERRIDABLE)[number];

/** The form field holding each override, shared by the item and item group forms. */
export const OVERRIDE_FIELD = { hsn: "hsnOverride", gstRatePct: "gstOverride", unit: "unitOverride" } as const;

const initialSet = (defaults?: ItemDefaults) => new Set(OVERRIDABLE.filter((key) => defaults?.[key] !== undefined));

// Which inherited values (HSN, GST rate, unit) are changed at this level.
// Kept apart from the field values so "Change" shows an editor even before
// anything is typed into it.
export function useOverrides(defaults?: ItemDefaults) {
  const [overridden, setOverridden] = useState<Set<Overridable>>(() => initialSet(defaults));

  const add = (key: Overridable) => setOverridden((current) => new Set(current).add(key));
  const remove = (key: Overridable) =>
    setOverridden((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });
  const restore = () => setOverridden(initialSet(defaults));

  return { overridden, add, remove, restore };
}
