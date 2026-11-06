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
}

// The open invoices or bills (and opening balance) of one party, with what
// is left on each and a box for how much of this money goes to it.
export function AllocationTable<T extends AllocationRowsForm>({ documents, rowIds, register, errors, today, documentWord }: AllocationTableProps<T>) {
  const rowErrors = (errors as FieldErrors<AllocationRowsForm>).allocations;
  const field = register as unknown as UseFormRegister<AllocationRowsForm>;
  return (
    <GlassTable className="min-w-[620px]">
      <thead>
        <tr className="text-right">
          <th scope="col" className="text-left">{documentWord}</th>
          <th scope="col" className="text-left">Due</th>
          <th scope="col">Balance</th>
          <th scope="col" className="w-44">Apply</th>
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
            <td className="text-left">{document.dueDate ? formatDayMonth(document.dueDate) : "Due"}</td>
            <td>{formatInr(document.balance)}</td>
            <td>
              <TextField
                label={`Apply to ${document.number}`}
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
