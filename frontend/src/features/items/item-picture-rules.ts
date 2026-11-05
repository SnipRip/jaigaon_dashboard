// What the item form lets through as pictures, checked before upload so a
// large file never leaves the browser. The backend checks again, and reads
// the type from the file's content rather than its name
// (backend/src/items/item-picture-rules.ts).

export const MAX_PICTURE_BYTES = 1024 * 1024;

/** Pictures one item may have; they are for sending to clients. Same as the backend. */
export const MAX_PICTURES_PER_ITEM = 10;

export const PICTURE_ACCEPT = "image/jpeg,image/png,image/webp";

/** A stored picture of the item. */
export interface ItemPicture {
  id: string;
  url: string;
}

/** A picked file waiting for Save, with a data URL to preview it. */
export interface NewPicture {
  key: string;
  file: File;
  preview: string;
}

/** What Save does to the item's pictures: removes stored ones, then uploads new ones. */
export interface PictureChanges {
  added: NewPicture[];
  /** Ids of stored pictures to remove. */
  removed: string[];
}

export const NO_PICTURE_CHANGES: PictureChanges = { added: [], removed: [] };

export const hasPictureChanges = (changes: PictureChanges) => changes.added.length > 0 || changes.removed.length > 0;

/** Why a picked file cannot be an item picture, or null when it can. */
export function pictureProblem(file: File): string | null {
  if (!PICTURE_ACCEPT.split(",").includes(file.type)) return `${file.name} is not a JPEG, PNG or WebP picture.`;
  if (file.size > MAX_PICTURE_BYTES) return `${file.name} is over 1 MB. Pictures can be up to 1 MB each.`;
  if (file.size === 0) return `${file.name} is empty.`;
  return null;
}
