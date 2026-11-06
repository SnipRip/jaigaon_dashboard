// One global search result, as the top bar shows it.
export interface SearchResultView {
  /** "Item", "Invoice", "Shipping Bill", … */
  kind: string;
  title: string;
  detail: string;
  /** The dashboard page it opens. */
  href: string;
}
