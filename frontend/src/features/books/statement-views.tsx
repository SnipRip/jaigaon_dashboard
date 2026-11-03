"use client";

import type { BalanceSheetView, GroupBalanceView, ProfitAndLossView, StatementLineView } from "@/types/ledger";
import { TwoSidedStatement, type StatementItem } from "./two-sided-statement";

/** A group's sub-groups and ledgers, in the line's sign (1: debit side normal, -1: credit side). */
const detailsOf = (group: GroupBalanceView | undefined, sign: 1 | -1) =>
  group
    ? [...group.groups, ...group.ledgers].filter((part) => part.closing !== 0).map((part) => ({ name: part.name, amount: sign * part.closing }))
    : [];

const itemsOf = (lines: StatementLineView[], sign: 1 | -1): StatementItem[] =>
  lines.filter((line) => line.amount !== 0).map((line) => ({ name: line.name, amount: line.amount, details: detailsOf(line.group, sign) }));

// Tally's Profit & Loss with gross profit: the trading part (stock,
// purchases, direct expenses against sales, direct incomes) carries gross
// profit down; indirect expenses and incomes then give nett profit.
export function ProfitAndLossStatement({ pl }: { pl: ProfitAndLossView }) {
  const gross = pl.grossProfit;
  const net = pl.netProfit;
  return (
    <div className="flex flex-col gap-3.5">
      <TwoSidedStatement
        title="Trading account"
        left={{
          title: "Particulars (Dr)",
          items: [
            { name: "Opening Stock", amount: pl.openingStock },
            ...itemsOf(pl.tradingExpenses, 1),
            ...(gross > 0 ? [{ name: "Gross Profit c/o", amount: gross, emphasis: true }] : []),
          ],
        }}
        right={{
          title: "Particulars (Cr)",
          items: [
            ...itemsOf(pl.tradingIncomes, -1),
            { name: "Closing Stock", amount: pl.closingStock },
            ...(gross < 0 ? [{ name: "Gross Loss c/o", amount: -gross, emphasis: true }] : []),
          ],
        }}
      />
      <TwoSidedStatement
        title="Profit & Loss account"
        left={{
          title: "Particulars (Dr)",
          items: [
            ...(gross < 0 ? [{ name: "Gross Loss b/f", amount: -gross }] : []),
            ...itemsOf(pl.indirectExpenses, 1),
            ...(net > 0 ? [{ name: "Nett Profit", amount: net, emphasis: true }] : []),
          ],
        }}
        right={{
          title: "Particulars (Cr)",
          items: [
            ...(gross > 0 ? [{ name: "Gross Profit b/f", amount: gross }] : []),
            ...itemsOf(pl.indirectIncomes, -1),
            ...(net < 0 ? [{ name: "Nett Loss", amount: -net, emphasis: true }] : []),
          ],
        }}
      />
    </div>
  );
}

// Tally's Balance Sheet: liabilities with Profit & Loss A/c and any
// difference in opening balances, against assets with closing stock. A loss
// and a debit difference sit with the assets.
export function BalanceSheetStatement({ sheet }: { sheet: BalanceSheetView }) {
  const profit = sheet.profitAndLoss;
  const profitDetails = [
    { name: "Opening balance", amount: profit.opening },
    { name: "Current period", amount: profit.currentPeriod },
  ];
  const difference = sheet.differenceInOpening;
  const assets = itemsOf(sheet.assets, 1).map((item) =>
    item.name === "Current Assets"
      ? {
          ...item,
          details: (item.details ?? []).map((detail) => (detail.name === "Stock-in-Hand" ? { name: "Closing Stock", amount: sheet.closingStock } : detail)),
        }
      : item,
  );
  return (
    <TwoSidedStatement
      left={{
        title: "Liabilities",
        items: [
          ...itemsOf(sheet.liabilities, -1),
          ...(profit.total > 0 ? [{ name: "Profit & Loss A/c", amount: profit.total, details: profitDetails }] : []),
          ...(difference > 0 ? [{ name: "Difference in opening balances", amount: difference, emphasis: true }] : []),
        ],
      }}
      right={{
        title: "Assets",
        items: [
          ...assets,
          ...(profit.total < 0 ? [{ name: "Profit & Loss A/c (loss)", amount: -profit.total, details: profitDetails.map((detail) => ({ ...detail, amount: -detail.amount })) }] : []),
          ...(difference < 0 ? [{ name: "Difference in opening balances", amount: -difference, emphasis: true }] : []),
        ],
      }}
    />
  );
}
