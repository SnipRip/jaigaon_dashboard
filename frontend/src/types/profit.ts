// Actual profit as the backend returns it (GET /profit?from&to).

export interface ProfitView {
  sales: number;
  cost: number;
  expenses: number;
  profit: number;
  marginPct: number;
}

export type ProfitRowKind = "invoice" | "shipment" | "customer" | "item";

export interface ProfitRowView extends ProfitView {
  key: string;
  label: string;
  detail: string | null;
  /** What the row links to; null for the "Not on a truck" row. */
  kind: ProfitRowKind | null;
}

export interface ProfitReportView {
  from: string;
  to: string;
  byInvoice: ProfitRowView[];
  byShipment: ProfitRowView[];
  byCustomer: ProfitRowView[];
  byItem: ProfitRowView[];
  total: ProfitView;
  overheads: { total: number; byHead: { head: string; amount: number; count: number }[] };
  /** Shipment expenses not linked to a truck yet. */
  unassigned: { total: number; count: number };
  netProfit: number;
}
