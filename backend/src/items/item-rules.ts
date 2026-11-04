// Pure rules of the item master, shared by items and item groups. The
// frontend applies the same rules in features/items/item-rules.ts and
// item-schema.ts; these are the ones the database relies on.

export interface GroupAttribute {
  name: string;
  options: string[];
}

export const MAX_GROUP_ATTRIBUTES = 3;

/** The first value set, walking item → group → sub-category → category. */
export function inherited<T>(...levels: (T | null | undefined)[]): T | null {
  for (const value of levels) if (value !== null && value !== undefined) return value;
  return null;
}

/** Attributes as stored in ItemGroup.attributes; anything malformed reads as none. */
export function readAttributes(stored: unknown): GroupAttribute[] {
  if (!Array.isArray(stored)) return [];
  return stored.filter(
    (entry): entry is GroupAttribute =>
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as GroupAttribute).name === 'string' &&
      Array.isArray((entry as GroupAttribute).options) &&
      (entry as GroupAttribute).options.every((option) => typeof option === 'string'),
  );
}

export function checkAttributes(attributes: GroupAttribute[]): string | null {
  if (attributes.length < 1 || attributes.length > MAX_GROUP_ATTRIBUTES) {
    return `A group has one to ${MAX_GROUP_ATTRIBUTES} attributes`;
  }
  const names = attributes.map((attribute) => attribute.name.trim().toLowerCase());
  if (new Set(names).size !== names.length) return 'Attribute names must differ';
  for (const attribute of attributes) {
    const options = attribute.options.map((option) => option.trim().toLowerCase());
    if (options.length === 0) return `Add at least one option to ${attribute.name}`;
    if (options.some((option) => option === '')) return `${attribute.name} has an empty option`;
    if (new Set(options).size !== options.length) return `${attribute.name} has the same option twice`;
  }
  return null;
}

/** A variant names exactly one listed option for each of its group's attributes. */
export function checkVariantValues(
  attributes: GroupAttribute[],
  values: Record<string, unknown> | null | undefined,
): string | null {
  if (!values) return 'Pick a value for each of the group’s attributes';
  const keys = Object.keys(values);
  if (keys.length !== attributes.length) return 'Pick a value for each of the group’s attributes';
  for (const attribute of attributes) {
    const value = values[attribute.name];
    if (typeof value !== 'string' || !attribute.options.includes(value)) {
      return `${attribute.name} must be one of: ${attribute.options.join(', ')}`;
    }
  }
  return null;
}

/** Same values in the group's attribute order, for duplicate checks. */
export const variantKey = (attributes: GroupAttribute[], values: Record<string, unknown>) =>
  attributes.map((attribute) => String(values[attribute.name])).join('\u0000');

/** "TMT Bar Fe 600" + { Size: "12 mm" } → "TMT Bar Fe 600 12 mm". */
export const variantName = (groupName: string, attributes: GroupAttribute[], values: Record<string, unknown>) =>
  [groupName, ...attributes.map((attribute) => String(values[attribute.name]))].join(' ');

export function checkAlternateUnits(baseUnitId: string, unitIds: string[]): string | null {
  if (unitIds.includes(baseUnitId)) return 'An alternate unit cannot be the base unit';
  if (new Set(unitIds).size !== unitIds.length) return 'Each alternate unit can be listed once';
  return null;
}

export function checkOpeningStock(godownIds: string[]): string | null {
  return new Set(godownIds).size === godownIds.length ? null : 'Each godown can be listed once';
}

/** Stock value at cost when none is given, rounded to paise. */
export const openingValue = (quantity: number, rate: number, value?: number | null) =>
  value ?? Math.round(quantity * rate * 100) / 100;
