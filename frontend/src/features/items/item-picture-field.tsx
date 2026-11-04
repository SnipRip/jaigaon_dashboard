"use client";

import { Trash2, Undo2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FilePicker } from "@/components/ui/file-picker";
import { ItemThumbnail } from "./item-thumbnail";
import { PICTURE_ACCEPT, pictureProblem, type PictureChange } from "./item-picture-rules";

interface ItemPictureFieldProps {
  name: string;
  /** The stored picture, when the item has one. */
  currentUrl?: string;
  change: PictureChange;
  onChange: (change: PictureChange) => void;
}

// Pick, preview, replace or remove the item's picture. Nothing is uploaded
// here: the change goes with the form's Save, like every other field.
export function ItemPictureField({ name, currentUrl, change, onChange }: ItemPictureFieldProps) {
  const [problem, setProblem] = useState<string | null>(null);
  const shown = change === "remove" ? undefined : (change?.preview ?? currentUrl);

  const pick = (file: File | null) => {
    setProblem(null);
    if (!file) return onChange(undefined);
    const reason = pictureProblem(file);
    if (reason) return setProblem(reason);
    const reader = new FileReader();
    reader.onload = () => onChange({ file, preview: String(reader.result) });
    reader.onerror = () => setProblem("Could not read this file. Choose it again.");
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-wrap items-start gap-3.5">
      <ItemThumbnail src={shown} alt={shown ? `Picture of ${name || "this item"}` : ""} size={132} />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <FilePicker
          label="Picture"
          accept={PICTURE_ACCEPT}
          file={change && change !== "remove" ? change.file : null}
          onChange={pick}
          hint="JPEG, PNG or WebP, up to 1 MB. Saved with the item."
        />
        {problem && (
          <p role="alert" className="text-xs font-semibold text-danger-strong">
            {problem}
          </p>
        )}
        {change === "remove" ? (
          <Button variant="neutral" onClick={() => onChange(undefined)} className="self-start">
            <Undo2 aria-hidden="true" />
            Keep the picture
          </Button>
        ) : (
          currentUrl &&
          !change && (
            <Button variant="danger" onClick={() => onChange("remove")} className="self-start">
              <Trash2 aria-hidden="true" />
              Remove picture
            </Button>
          )
        )}
        {change === "remove" && <p className="text-xs font-semibold text-muted">The picture is removed when you save.</p>}
      </div>
    </div>
  );
}
