"use client";

import Link from "next/link";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { GlassTable } from "@/components/ui/glass-table";
import { TextField } from "@/components/ui/text-field";
import { formatDayMonth, formatInr } from "@/lib/format";
import type { OpenDocumentView } from "@/types/settlement";
import { documentHref, msmeDaysLeft } from "./settlements-api";

interface AllocationRowsForm {
  allocations: { kind: string; documentId: string; balance: number; amount: string }[];
}

interface AllocationTableProps<T extends AllocationRowsForm> {
  /** The rows' documents, in the rows' order. */
  documents: OpenDocumentView[];
  rowIds: string[];
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  today: string | null;
  documentWord: string;
  /** The amount column's head: "Apply", or "Refund" on a refund of advances. */
  applyWord?: string;
}

// The open invoices or bills (and opening balance) of one party, or the
// advances it holds (a refund), with what is left on each and a box for how
// much of this money goes to it.
export function AllocationTable<T extends AllocationRowsForm>({ documents, rowIds, register, errors, today, documentWord, applyWord = "Apply" }: AllocationTableProps<T>) {
  const rowErrors = (errors as FieldErrors<AllocationRowsForm>).allocations;
  const field = register as unknown as UseFormRegister<AllocationRowsForm>;
  // Advances (a refund) have no due date.
  const showDue = documents.some((document) => document.kind !== "ADVANCE");
  return (
    <GlassTable className="min-w-[620px]">
      <thead>
        <tr className="text-right">
          <th scope="col" className="text-left">{documentWord}</th>
          {showDue && <th scope="col" className="text-left">Due</th>}
          <th scope="col">{showDue ? "Balance" : "Advance left"}</th>
          <th scope="col" className="w-44">{applyWord}</th>
        </tr>
      </thead>
      <tbody className="text-right font-semibold tabular-nums">
        {documents.map((document, index) => (
          <tr key={rowIds[index]} className="align-top">
            <td className="text-left">
              <Link href={documentHref(document)} className="font-semibold hover:text-brand hover:underline">
                {document.number}
              </Link>
              <div className="text-xs text-muted">
                {document.date ? formatDayMonth(document.date) : "Brought forward"}
                {document.flag === "EXPORT" && " · export"}
                {document.flag === "MSME" && document.dueDate && today && ` · MSME, ${Math.max(msmeDaysLeft(document, today), 0)} days left`}
              </div>
            </td>
            {showDue && <td className="text-left">{document.kind === "ADVANCE" ? "–" : document.dueDate ? formatDayMonth(document.dueDate) : "Due"}</td>}
            <td>{formatInr(document.balance)}</td>
            <td>
              <TextField
                label={`${applyWord} ${document.kind === "ADVANCE" ? "from" : "to"} ${document.number}`}
                hideLabel
                className="text-right"
                inputMode="decimal"
                error={rowErrors?.[index]?.amount?.message}
                {...field(`allocations.${index}.amount`)}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </GlassTable>
  );
}
