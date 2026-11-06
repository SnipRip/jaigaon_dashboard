"use client";

import useSWR from "swr";
import { LoadNotice } from "@/components/ui/load-notice";
import { useCompanyProfile } from "@/features/company/use-company-profile";
import { BANK_CASH_PATH, withArchived } from "@/features/masters/masters-api";
import { PARTIES_LIST_PATH } from "@/features/parties/parties-api";
import { issuerOf } from "@/features/quotations/quotations-api";
import { apiGet } from "@/lib/api-client";
import type { BankCashAccountView } from "@/types/bank-cash";
import type { PartyView } from "@/types/party";
import type { OpenDocumentView, SettlementDirectionView, SettlementView } from "@/types/settlement";
import { PartyLedger } from "./party-ledger";
import { PaymentsWorkspace } from "./payments-workspace";
import { SettlementDetail } from "./settlement-detail";
import { SettlementForm } from "./settlement-form";
import { documentsPath, SETTLEMENTS_PATH, statementRows } from "./settlements-api";

// The payments pages' client screens, on the backend: receipts and payments
// (/settlements), what is open in each direction (/settlements/documents),
// parties and bank & cash accounts.
function usePaymentData() {
  const settlements = useSWR<SettlementView[]>(SETTLEMENTS_PATH, apiGet);
  const receivable = useSWR<OpenDocumentView[]>(documentsPath("RECEIPT"), apiGet);
  const payable = useSWR<OpenDocumentView[]>(documentsPath("PAYMENT"), apiGet);
  const parties = useSWR<PartyView[]>(PARTIES_LIST_PATH, apiGet);
  const accounts = useSWR<BankCashAccountView[]>(withArchived(BANK_CASH_PATH), apiGet);
  const data =
    settlements.data && receivable.data && payable.data && parties.data && accounts.data
      ? { settlements: settlements.data, receivable: receivable.data, payable: payable.data, parties: parties.data, accounts: accounts.data }
      : undefined;
  return {
    data,
    error: settlements.error ?? receivable.error ?? payable.error ?? parties.error ?? accounts.error,
    /** After a save, apply or cancel: settlements and both document lists. */
    reload: async () => {
      await Promise.all([settlements.mutate(), receivable.mutate(), payable.mutate()]);
    },
  };
}

export function PaymentsScreen() {
  const { data, error } = usePaymentData();
  if (!data) return <LoadNotice error={error} what="payments" />;
  return <PaymentsWorkspace receivable={data.receivable} payable={data.payable} settlements={data.settlements} />;
}

/** `documentId` opens the form on that invoice or bill (its "Record receipt" / "Pay"). */
export function NewSettlementScreen({ direction, documentId }: { direction: SettlementDirectionView; documentId?: string }) {
  const { data, error, reload } = usePaymentData();
  if (!data) return <LoadNotice error={error} what="the form" />;
  const role = direction === "RECEIPT" ? "isCustomer" : "isVendor";
  return (
    <SettlementForm
      direction={direction}
      parties={data.parties.filter((party) => party[role] && !party.isArchived).map((party) => ({ value: party.id, label: party.displayName }))}
      documents={direction === "RECEIPT" ? data.receivable : data.payable}
      accounts={data.accounts}
      initialDocumentId={documentId}
      onSaved={reload}
    />
  );
}

export function SettlementScreen({ settlementId }: { settlementId: string }) {
  const { data, error, reload } = usePaymentData();
  const { profile, error: profileError } = useCompanyProfile();
  if (!data || !profile) return <LoadNotice error={error ?? profileError} what="the receipt or payment" />;
  const settlement = data.settlements.find((candidate) => candidate.id === settlementId);
  if (!settlement) return <LoadNotice error={new Error("This receipt or payment does not exist.")} what="the receipt or payment" />;
  const documents = (settlement.direction === "RECEIPT" ? data.receivable : data.payable).filter((document) => document.partyId === settlement.partyId);
  return <SettlementDetail settlement={settlement} documents={documents} issuer={issuerOf(profile)} onChanged={reload} />;
}

export function LedgerScreen({ partyId }: { partyId: string }) {
  const { data, error } = usePaymentData();
  if (!data) return <LoadNotice error={error} what="the statement" />;
  const party = data.parties.find((candidate) => candidate.id === partyId);
  if (!party) return <LoadNotice error={new Error("This party does not exist.")} what="the statement" />;
  const mine = <T extends { partyId: string }>(rows: T[]) => rows.filter((row) => row.partyId === party.id);
  const signed = (side: "RECEIVABLE" | "PAYABLE") => (party.openingBalanceSide === side ? party.openingBalance : -party.openingBalance);
  const receipts = mine(data.settlements).filter((settlement) => settlement.direction === "RECEIPT");
  const payments = mine(data.settlements).filter((settlement) => settlement.direction === "PAYMENT");

  const sections = [
    party.isCustomer && {
      title: "as customer",
      balanceLabel: "Owes us",
      chargeLabel: "Invoiced",
      settleLabel: "Received",
      opening: signed("RECEIVABLE"),
      rows: statementRows(signed("RECEIVABLE"), mine(data.receivable), receipts),
    },
    party.isVendor && {
      title: "as vendor",
      balanceLabel: "We owe",
      chargeLabel: "Billed",
      settleLabel: "Paid",
      opening: signed("PAYABLE"),
      rows: statementRows(signed("PAYABLE"), mine(data.payable), payments),
    },
  ].filter((section) => section !== false);
  return <PartyLedger partyName={party.displayName} sections={sections} />;
}
