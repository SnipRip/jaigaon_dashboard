// Pure helpers for global search: the query split into words and the Prisma
// filter "every word appears in at least one of these fields".
import type { DispatchDocumentKind } from '../generated/prisma/enums.js';

/** At most this many words are matched; more add little and cost a scan each. */
export const MAX_WORDS = 5;

/** Lower-case words of the query, spaces and repeats dropped. */
export const searchWords = (query: string) => [...new Set(query.toLowerCase().split(/\s+/).filter(Boolean))].slice(0, MAX_WORDS);

/** Case-insensitive "contains" on one column. */
export const has = (word: string) => ({ contains: word, mode: 'insensitive' as const });

/** One field of a record, as a filter for a single word (a column or a relation's column). */
export type FieldMatch<W> = (word: string) => W;

/** Every word must match one of the fields: AND over words of OR over fields. */
export const everyWord = <W>(words: string[], fields: FieldMatch<W>[]) => ({
  AND: words.map((word) => ({ OR: fields.map((field) => field(word)) })),
});

/** "QT/2627/0004 (rev 2)": a quotation's number with its revision once revised. */
export const quotationTitle = (number: string, revision: number) => (revision > 0 ? `${number} (rev ${revision})` : number);

/** How a dispatch document is named in the results, as on the invoice page. */
export const DOCUMENT_LABELS: Record<DispatchDocumentKind, string> = {
  E_INVOICE: 'IRN',
  LORRY_CHALLAN: 'Lorry challan',
  EWAY_BILL: 'E-way bill',
  CUSTOMS_INVOICE: 'Customs invoice',
  PACKING_LIST: 'Packing list',
  SHIPPING_BILL: 'Shipping Bill',
  LEO: 'LEO',
  BRC: 'BRC',
};
