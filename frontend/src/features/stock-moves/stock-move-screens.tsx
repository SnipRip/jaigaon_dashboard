"use client";

import { LoadNotice } from "@/components/ui/load-notice";
import type { StockAdjustmentView, StockTransferView } from "@/types/stock-moves";
import { AdjustmentDetail } from "./adjustment-detail";
import { AdjustmentForm } from "./adjustment-form";
import { AdjustmentsWorkspace } from "./adjustments-workspace";
import { STOCK_ADJUSTMENTS_PATH, STOCK_TRANSFERS_PATH, useStockMoveData } from "./stock-moves-api";
import { TransferDetail } from "./transfer-detail";
import { TransferForm } from "./transfer-form";
import { TransfersWorkspace } from "./transfers-workspace";

// The stock transfer and adjustment pages' client screens, from the backend.

const useTransfers = () => useStockMoveData<StockTransferView>(STOCK_TRANSFERS_PATH);
const useAdjustments = () => useStockMoveData<StockAdjustmentView>(STOCK_ADJUSTMENTS_PATH);

export function TransfersListScreen() {
  const { data, error } = useTransfers();
  if (!data) return <LoadNotice error={error} what="stock transfers" />;
  return <TransfersWorkspace transfers={data.documents} />;
}

export function NewTransferScreen() {
  const { data, error, reload } = useTransfers();
  if (!data) return <LoadNotice error={error} what="the transfer form" />;
  return <TransferForm catalog={data.masters.catalog} godowns={data.masters.godowns.filter((godown) => !godown.isArchived)} onSaved={reload} />;
}

export function TransferScreen({ transferId }: { transferId: string }) {
  const { data, error, reload } = useTransfers();
  if (!data) return <LoadNotice error={error} what="the transfer" />;
  const transfer = data.documents.find((candidate) => candidate.id === transferId);
  if (!transfer) return <LoadNotice error={new Error("This transfer does not exist.")} what="the transfer" />;
  return <TransferDetail transfer={transfer} onChanged={reload} />;
}

export function AdjustmentsListScreen() {
  const { data, error } = useAdjustments();
  if (!data) return <LoadNotice error={error} what="stock adjustments" />;
  return <AdjustmentsWorkspace adjustments={data.documents} />;
}

export function NewAdjustmentScreen() {
  const { data, error, reload } = useAdjustments();
  if (!data) return <LoadNotice error={error} what="the adjustment form" />;
  return <AdjustmentForm catalog={data.masters.catalog} godowns={data.masters.godowns.filter((godown) => !godown.isArchived)} onSaved={reload} />;
}

export function AdjustmentScreen({ adjustmentId }: { adjustmentId: string }) {
  const { data, error, reload } = useAdjustments();
  if (!data) return <LoadNotice error={error} what="the adjustment" />;
  const adjustment = data.documents.find((candidate) => candidate.id === adjustmentId);
  if (!adjustment) return <LoadNotice error={new Error("This adjustment does not exist.")} what="the adjustment" />;
  return <AdjustmentDetail adjustment={adjustment} onChanged={reload} />;
}
