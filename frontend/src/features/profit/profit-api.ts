// Actual profit on the backend: the report path and where each row links.
import { financialYearOf } from "@/lib/financial-year";
import type { ProfitRowView } from "@/types/profit";

export const profitPath = (from: string, to: string) => `/profit?from=${from}&to=${to}`;

const PAGES: Record<NonNullable<ProfitRowView["kind"]>, string> = {
  invoice: "/invoices",
  shipment: "/shipments",
  customer: "/customers",
  item: "/items",
};

export const profitRowHref = (row: ProfitRowView) => (row.kind ? `${PAGES[row.kind]}/${row.key}` : undefined);

/** 1 April of the financial year a YYYY-MM-DD date falls in. */
export const financialYearStart = (isoDate: string) => `${financialYearOf(isoDate).slice(0, 4)}-04-01`;
