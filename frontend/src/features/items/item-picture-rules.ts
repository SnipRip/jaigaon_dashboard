// What the item form lets through as a picture, checked before upload so a
// large file never leaves the browser. The backend checks again, and reads
// the type from the file's content rather than its name
// (backend/src/items/item-picture-rules.ts).

export const MAX_PICTURE_BYTES = 1024 * 1024;

export const PICTURE_ACCEPT = "image/jpeg,image/png,image/webp";

/** A picked file waiting for Save, with a data URL to preview it; "remove"; or undefined when unchanged. */
export type PictureChange = { file: File; preview: string } | "remove" | undefined;

/** Why a picked file cannot be the item's picture, or null when it can. */
export function pictureProblem(file: File): string | null {
  if (!PICTURE_ACCEPT.split(",").includes(file.type)) return "Choose a JPEG, PNG or WebP picture.";
  if (file.size > MAX_PICTURE_BYTES) return `This picture is ${(file.size / MAX_PICTURE_BYTES).toFixed(1)} MB. Pictures can be up to 1 MB.`;
  if (file.size === 0) return "This file is empty.";
  return null;
}
