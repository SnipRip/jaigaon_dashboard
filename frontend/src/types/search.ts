// One global search result as the backend returns it (backend/src/search/search-views.ts).
export interface SearchResultView {
  /** "Item", "Invoice", "Shipping Bill", … */
  kind: string;
  title: string;
  detail: string;
  /** The dashboard page it opens. */
  href: string;
}
