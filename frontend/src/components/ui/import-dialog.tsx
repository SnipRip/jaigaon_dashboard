"use client";

import { Upload } from "lucide-react";
import { useState } from "react";
import { Button } from "./button";
import { FilePicker } from "./file-picker";
import { FilterChip } from "./filter-chip";
import { FormMessage } from "./form-message";
import { GlassModal } from "./glass-modal";

interface ImportDialogProps {
  /** "items", "customers" … */
  what: string;
  /** Column headings the spreadsheet must have, in order. */
  columns: string[];
}

// "Import before typing" (masters-plan.md): every list can be filled from an
// Excel or CSV sheet, or from a Tally masters export. The button and the
// form are real; reading the file switches on with the backend.
export function ImportDialog({ what, columns }: ImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<"sheet" | "tally">("sheet");
  const [message, setMessage] = useState<string | null>(null);

  return (
    <>
      <Button variant="neutral" onClick={() => setOpen(true)}>
        <Upload aria-hidden="true" className="size-[18px]" />
        Import
      </Button>
      <GlassModal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setMessage(null);
        }}
        title={`Import ${what}`}
        description="From an Excel or CSV sheet, or from Tally's masters export, so nothing is typed twice."
        footer={
          <>
            <Button variant="neutral" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                setMessage(
                  file
                    ? `${file.name} is ready. Reading it switches on when ${what} are connected to the database.`
                    : "Choose a file first.",
                )
              }
            >
              Check and import
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap gap-2">
          {(["sheet", "tally"] as const).map((option) => (
            <FilterChip key={option} selected={source === option} onClick={() => setSource(option)}>
              {option === "sheet" ? "Excel or CSV sheet" : "Tally masters export (XML)"}
            </FilterChip>
          ))}
        </div>
        <FilePicker
          label="File"
          accept={source === "sheet" ? ".xlsx,.xls,.csv" : ".xml"}
          file={file}
          onChange={setFile}
          hint={source === "sheet" ? "First row holds the column headings below." : "Gateway of Tally → Export → Masters, in XML."}
        />
        {source === "sheet" && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-muted">Columns, in this order</span>
            <div className="flex flex-wrap gap-1.5">
              {columns.map((column) => (
                <span key={column} className="glass-inset rounded-full px-3 py-1 text-xs font-bold">
                  {column}
                </span>
              ))}
            </div>
          </div>
        )}
        {message && <FormMessage tone={file ? "success" : "error"}>{message}</FormMessage>}
      </GlassModal>
    </>
  );
}
