// SKUs are optional (client, 7 Nov 2026). When wanted, they are generated
// the way Zoho does: a pattern of parts (the group name, an attribute's
// value, fixed text), each showing all of its letters or only the first few,
// joined by a separator in upper or lower case. A SKU that is already taken
// gets -2, -3 … added, as Zoho numbers duplicates.

export type SkuPartSource = { kind: "name" } | { kind: "attribute"; attribute: string } | { kind: "text"; text: string };

export interface SkuPart {
  source: SkuPartSource;
  /** Letters to keep from the start; 0 = all. Ignored for fixed text. */
  letters: number;
}

export const SKU_SEPARATORS = ["-", "/", "."] as const;
export type SkuSeparator = (typeof SKU_SEPARATORS)[number];

export interface SkuPattern {
  parts: SkuPart[];
  separator: SkuSeparator;
  letterCase: "upper" | "lower";
}

/** The backend's rule: 2–40 letters, digits and the separators. */
export const SKU_PATTERN = /^[A-Za-z0-9./-]+$/;
export const SKU_MESSAGE = "Use letters, digits, dashes, slashes and dots only";
export const SKU_MAX = 40;

/** "Fe 600 (Hind)" → "FE600HIND": letters and digits only. */
const compact = (text: string) => text.replace(/[^A-Za-z0-9]/g, "");

function partText(part: SkuPart, name: string, values: Record<string, string>): string {
  const raw = part.source.kind === "name" ? name : part.source.kind === "attribute" ? (values[part.source.attribute] ?? "") : part.source.text;
  const text = compact(raw);
  return part.source.kind === "text" || part.letters <= 0 ? text : text.slice(0, part.letters);
}

/** One SKU from the pattern, before duplicates are numbered. */
export function skuFromPattern(pattern: SkuPattern, name: string, values: Record<string, string>): string {
  const joined = pattern.parts
    .map((part) => partText(part, name, values))
    .filter(Boolean)
    .join(pattern.separator)
    .slice(0, SKU_MAX);
  return pattern.letterCase === "upper" ? joined.toUpperCase() : joined.toLowerCase();
}

/** `sku`, or `sku-2`, `sku-3` … the first one not in `taken` (compared ignoring case). Adds it to `taken`. */
export function uniqueSku(sku: string, taken: Set<string>): string {
  let candidate = sku;
  for (let n = 2; taken.has(candidate.toUpperCase()); n++) {
    const suffix = `-${n}`;
    candidate = sku.slice(0, SKU_MAX - suffix.length) + suffix;
  }
  taken.add(candidate.toUpperCase());
  return candidate;
}

/** Zoho's starting pattern: the group name's first three letters, then every attribute in full. */
export function defaultGroupPattern(attributes: string[]): SkuPattern {
  return {
    parts: [{ source: { kind: "name" }, letters: 3 }, ...attributes.map((attribute) => ({ source: { kind: "attribute", attribute } as const, letters: 0 }))],
    separator: "-",
    letterCase: "upper",
  };
}

/**
 * A SKU for a single item: category, brand and name, three letters each
 * (the name's first three words), e.g. Cement · UltraTech · OPC 53 Grade →
 * CEM-ULT-OPC53GRA. Numbered when taken.
 */
export function suggestItemSku(input: { name: string; category?: string; brand?: string }, taken: Set<string>): string {
  const three = (text?: string) => compact(text ?? "").slice(0, 3);
  const nameWords = input.name.split(/\s+/).filter(Boolean).slice(0, 3).map(three).join("");
  const sku = [three(input.category), three(input.brand), nameWords].filter(Boolean).join("-").toUpperCase().slice(0, SKU_MAX);
  return uniqueSku(sku.length >= 2 ? sku : `ITEM-${sku}`, taken);
}
