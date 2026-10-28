// The search entry shape and the matcher. No data imports here, so the top
// bar can match in the browser without bundling the records themselves.

export interface SearchEntry {
  kind: string;
  title: string;
  detail: string;
  href: string;
  /** Lower-case text the query words are matched against. */
  terms: string;
}

/** Every word of the query must appear; in index order, at most `limit`. */
export function searchEntries(index: SearchEntry[], query: string, limit = 8) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return index.filter((candidate) => words.every((word) => candidate.terms.includes(word))).slice(0, limit);
}
