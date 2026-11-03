"use client";

import { Download, Upload } from "lucide-react";
import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { apiGet, apiRequest, downloadFile, saveErrorText } from "@/lib/api-client";
import { formatQuantity } from "@/lib/format";
import type { ImportJobView } from "@/types/import-job";
import { Button } from "./button";
import { FilePicker } from "./file-picker";
import { FormMessage } from "./form-message";
import { GlassModal } from "./glass-modal";

interface ImportDialogProps {
  /** "items", "customers" … */
  what: string;
  /** The backend importer (backend/src/imports): "units", "customers" … Left out on screens still on sample data. */
  master?: string;
}

const jobPath = (id: string) => `/imports/jobs/${id}`;
/** A stopped import is the same rows uploaded again: Excel counts the headings as row 1. */
const nextExcelRow = (job: ImportJobView) => formatQuantity(job.doneRows + 2);

// "Import before typing" (masters-plan.md). Download the master as an Excel
// sheet, edit or add rows, upload it back. The backend saves row by row as a
// job: wrong rows are skipped (downloadable with the reason beside each),
// and a stopped import carries on from the row it reached when the same
// file is uploaded again, so 5,000 rows never start over.
export function ImportDialog({ what, master }: ImportDialogProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="neutral" onClick={() => setOpen(true)}>
        <Upload aria-hidden="true" className="size-[18px]" />
        Import
      </Button>
      <GlassModal
        open={open}
        onOpenChange={setOpen}
        title={`Import ${what}`}
        description={
          master
            ? `Download the ${what} as an Excel sheet, edit rows or add new ones, and upload it back.`
            : `Importing switches on when ${what} are connected to the database.`
        }
        footer={
          <Button variant="neutral" onClick={() => setOpen(false)}>
            Close
          </Button>
        }
      >
        {open && master && <ImportSteps what={what} master={master} />}
      </GlassModal>
    </>
  );
}

function ImportSteps({ what, master }: { what: string; master: string }) {
  const { mutate } = useSWRConfig();
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [resumedFrom, setResumedFrom] = useState<number | null>(null);

  // The last import of this master: still running after the dialog was
  // closed, stopped part way, or done with skipped rows to download.
  const latest = useSWR<{ job: ImportJobView | null }>(`/imports/${master}/latest`, apiGet, { revalidateOnFocus: false });
  const watched = jobId ?? (latest.data?.job && latest.data.job.status !== "STOPPED" ? latest.data.job.id : null);
  const job = useSWR<ImportJobView>(watched ? jobPath(watched) : null, apiGet, {
    refreshInterval: (latest) => (latest && latest.status !== "RUNNING" ? 0 : 1000),
    // Every list on screen reloads once the import ends.
    onSuccess: (latest) => {
      if (latest.status !== "RUNNING") void mutate((key) => typeof key === "string" && !key.startsWith("/imports"));
    },
  }).data;
  const stopped = !jobId && latest.data?.job?.status === "STOPPED" ? latest.data.job : null;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
    } catch (error) {
      setMessage(saveErrorText(error));
    } finally {
      setBusy(false);
    }
  };

  const upload = () =>
    run(async () => {
      if (!file) throw new Error("Choose the file first.");
      const body = new FormData();
      body.append("file", file);
      const started = await apiRequest<ImportJobView>(`/imports/${master}`, { method: "POST", body });
      setResumedFrom(started.resumedFromRow);
      setJobId(started.id);
      setFile(null);
    });

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">1. Get the sheet</span>
        <div>
          <Button variant="neutral" disabled={busy} onClick={() => void run(() => downloadFile(`/imports/${master}/sheet`, `${master}.xlsx`))}>
            <Download aria-hidden="true" />
            Download {what} (Excel)
          </Button>
        </div>
        <p className="text-xs text-muted">
          Every {what.replace(/s$/, "")} on file, with a record ID that ties each row to it. Change any cell, add rows at the end
          (record ID blank), and upload it back. Columns you delete are left as they are.
        </p>
      </div>

      {stopped && (
        <p className="rounded-(--radius-tile) bg-warning-tint px-3 py-2 text-[13px] font-medium">
          The import of {stopped.fileName} stopped after {formatQuantity(stopped.doneRows)} of {formatQuantity(stopped.totalRows)} rows
          {stopped.error ? ` (${stopped.error})` : ""}. Upload the same file to carry on from row {nextExcelRow(stopped)}.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <FilePicker
          label="2. Upload the filled sheet"
          accept=".xlsx,.csv"
          file={file}
          onChange={setFile}
          hint="Excel (.xlsx) or CSV, first row the headings. Rows are matched by record ID, else by name, SKU or GSTIN."
        />
        <div>
          <Button disabled={busy || !file || job?.status === "RUNNING"} onClick={() => void upload()}>
            <Upload aria-hidden="true" />
            Import
          </Button>
        </div>
      </div>

      {job && <JobProgress job={job} resumedFrom={jobId ? resumedFrom : null} onSkipped={() => void run(() => downloadFile(`${jobPath(job.id)}/skipped`, `${master}-skipped-rows.xlsx`))} />}
      {message && <FormMessage tone="error">{message}</FormMessage>}
    </div>
  );
}

function JobProgress({ job, resumedFrom, onSkipped }: { job: ImportJobView; resumedFrom: number | null; onSkipped: () => void }) {
  const percent = job.totalRows ? Math.round((job.doneRows / job.totalRows) * 100) : 100;
  const counts = `${formatQuantity(job.created)} added · ${formatQuantity(job.updated)} updated · ${formatQuantity(job.skipped)} skipped`;
  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      <div className="flex items-baseline justify-between gap-3 text-[13px] font-medium">
        <span>
          {job.status === "RUNNING" ? "Importing" : job.status === "DONE" ? "Imported" : "Stopped"} {job.fileName}
        </span>
        <span className="text-muted tabular-nums">
          {formatQuantity(job.doneRows)} of {formatQuantity(job.totalRows)} rows
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Import progress"
        className="h-2 overflow-hidden rounded-full bg-neutral-tint"
      >
        <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-xs text-muted tabular-nums">
        {resumedFrom ? `Carried on from row ${formatQuantity(resumedFrom)}. ` : ""}
        {counts}
      </p>
      {job.status === "STOPPED" && (
        <FormMessage tone="error">{`Stopped at row ${nextExcelRow(job)}${job.error ? ` (${job.error})` : ""}. Upload the same file again to carry on from there.`}</FormMessage>
      )}
      {job.status === "DONE" && job.skipped === 0 && <FormMessage tone="success">{`All rows saved: ${counts}.`}</FormMessage>}
      {job.skipped > 0 && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-(--radius-tile) bg-warning-tint px-3 py-2 text-[13px] font-medium">
          <span className="flex-1">
            {formatQuantity(job.skipped)} {job.skipped === 1 ? "row was" : "rows were"} skipped. Download them with the reason beside each, fix
            them and upload that sheet.
          </span>
          <Button variant="neutral" onClick={onSkipped}>
            <Download aria-hidden="true" />
            Skipped rows
          </Button>
        </div>
      )}
    </div>
  );
}
