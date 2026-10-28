"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Upload } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FilePicker } from "@/components/ui/file-picker";
import { FormMessage } from "@/components/ui/form-message";
import { GlassModal } from "@/components/ui/glass-modal";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";

const schema = z.object({
  kind: z.string().min(1, "Pick the document type"),
  ownerId: z.string().min(1, "Pick the invoice or bill it belongs to"),
  number: z.string().trim().min(1, "Enter the document number").max(64),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date"),
});
type UploadValues = z.infer<typeof schema>;

interface UploadDocumentDialogProps {
  kinds: SelectOption[];
  owners: SelectOption[];
}

// Upload a scan and file it against its invoice or bill. The OCR inbox will
// read the number and date from the scan; until then they are typed.
export function UploadDocumentDialog({ kinds, owners }: UploadDocumentDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UploadValues>({ resolver: zodResolver(schema), defaultValues: { kind: "", ownerId: "", number: "", date: "" } });

  const close = () => {
    setOpen(false);
    setMessage(null);
    setFile(null);
    reset();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Upload aria-hidden="true" className="size-[18px]" />
        Upload a document
      </Button>
      <GlassModal open={open} onOpenChange={(next) => (next ? setOpen(true) : close())} title="Upload a document" description="A scan or PDF, filed against the invoice or bill it belongs to.">
        <form
          noValidate
          onSubmit={handleSubmit(() =>
            setMessage(file ? `${file.name} is ready to file. Uploading switches on when file storage is chosen.` : "The details check out. Choose the scan to upload."),
          )}
          className="flex flex-col gap-3.5"
        >
          <FilePicker label="Scan or PDF" accept="application/pdf,image/*" file={file} onChange={setFile} hint="Phone photos are fine; the OCR inbox will read them once it is connected." />
          <Controller
            control={control}
            name="kind"
            render={({ field }) => <SelectField label="Document type" options={kinds} value={field.value || undefined} onValueChange={field.onChange} />}
          />
          {errors.kind && <p className="-mt-2 text-xs font-semibold text-danger-strong">{errors.kind.message}</p>}
          <Controller
            control={control}
            name="ownerId"
            render={({ field }) => <SelectField label="Belongs to" options={owners} value={field.value || undefined} onValueChange={field.onChange} />}
          />
          {errors.ownerId && <p className="-mt-2 text-xs font-semibold text-danger-strong">{errors.ownerId.message}</p>}
          <div className="grid gap-3.5 sm:grid-cols-2">
            <TextField label="Document number" error={errors.number?.message} {...register("number")} />
            <TextField label="Date" type="date" error={errors.date?.message} {...register("date")} />
          </div>
          {message && <FormMessage tone={file ? "success" : "error"}>{message}</FormMessage>}
          <div className="flex flex-wrap justify-end gap-2.5">
            <Button variant="neutral" onClick={close}>
              Cancel
            </Button>
            <Button type="submit">File document</Button>
          </div>
        </form>
      </GlassModal>
    </>
  );
}
