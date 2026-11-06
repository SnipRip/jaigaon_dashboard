// Calls for purchase orders and vendor bills, and the conversion from the
// backend's bill to the `Bill` the purchase screens and rules read. The
// backend works out and stores the figures; the screens show the same ones
// live from features/purchases/purchase-rules.ts while a bill is typed.
import { apiRequest } from "@/lib/api-client";
import type { LandedCostMethodView, LastPurchaseRateView, PurchaseBillView, PurchaseOrderView } from "@/types/purchase";
import type { Bill, LandedCostMethod } from "./types";

export const PURCHASE_BILLS_PATH = "/purchase-bills";
export const PURCHASE_ORDERS_PATH = "/purchase-orders";

const method = (value: LandedCostMethodView) => value.toLowerCase() as LandedCostMethod;

export function toBill(view: PurchaseBillView): Bill {
  return {
    id: view.id,
    kind: view.kind === "GOODS" ? "goods" : "charges",
    reference: view.reference,
    vendorBillNumber: view.vendorBillNumber,
    date: view.date,
    dueDate: view.dueDate,
    status: view.status === "OPEN" ? "open" : "void",
    vendorId: view.vendorId,
    sourceOfSupply: view.sourceOfSupply ?? undefined,
    lines: view.lines.map((line) => ({
      itemId: line.itemId,
      description: line.description,
      hsn: line.hsn,
      unit: line.unit,
      quantity: line.quantity,
      rate: line.rate,
      discountPct: line.discountPct,
      gstRatePct: line.gstRatePct,
      itc: line.itcEligible ? "eligible" : "ineligible",
    })),
    charges: view.charges.map((charge) => ({
      head: charge.headId,
      description: charge.description ?? undefined,
      amount: charge.amount,
      gstRatePct: view.kind === "CHARGES" ? charge.gstRatePct : undefined,
    })),
    ewayBill: view.ewayBillNumber
      ? { number: view.ewayBillNumber, date: view.ewayBillDate ?? view.date, vehicleNumber: view.vehicleNumber ?? undefined }
      : undefined,
    landedCostFor: view.landedCostForId ?? undefined,
    allocation: method(view.allocation),
    // Payments applied on Payments & outstanding.
    paid: view.totals.paid,
    notes: view.notes ?? undefined,
    stored: view,
  };
}

export const createBill = (body: unknown) => apiRequest<PurchaseBillView>(PURCHASE_BILLS_PATH, { method: "POST", body });
export const voidBill = (id: string) => apiRequest<PurchaseBillView>(`${PURCHASE_BILLS_PATH}/${id}/void`, { method: "POST" });
export const setBillAllocation = (id: string, allocation: LandedCostMethod) =>
  apiRequest<PurchaseBillView>(`${PURCHASE_BILLS_PATH}/${id}/allocation`, { method: "PATCH", body: { allocation: allocation.toUpperCase() } });

/** SWR fetcher: key [path, vendorId, item ids joined by ","]. */
export const fetchLastRates = ([, vendorId, itemIds]: readonly [string, string | undefined, string]) =>
  apiRequest<LastPurchaseRateView[]>(`${PURCHASE_BILLS_PATH}/last-rates?${new URLSearchParams({ ...(vendorId ? { vendorId } : {}), itemIds })}`);

export const saveOrder = (id: string | undefined, body: unknown) =>
  id ? apiRequest<PurchaseOrderView>(`${PURCHASE_ORDERS_PATH}/${id}`, { method: "PUT", body }) : apiRequest<PurchaseOrderView>(PURCHASE_ORDERS_PATH, { method: "POST", body });
export const closeOrder = (id: string) => apiRequest<PurchaseOrderView>(`${PURCHASE_ORDERS_PATH}/${id}/close`, { method: "POST" });
export const cancelOrder = (id: string) => apiRequest<PurchaseOrderView>(`${PURCHASE_ORDERS_PATH}/${id}/cancel`, { method: "POST" });
