// What an item picture may be. The type is read from the file's first bytes
// (its signature), so a renamed .exe or .svg is refused whatever its name or
// the Content-Type the browser sent. The database CHECKs the same limits.

export const MAX_PICTURE_BYTES = 1024 * 1024;
export const PICTURE_TOO_LARGE = 'The picture is over 1 MB. Choose a smaller one';

/** Pictures one item may have; they are for sending to clients, not a gallery. */
export const MAX_PICTURES_PER_ITEM = 10;
export const TOO_MANY_PICTURES = `An item can have up to ${MAX_PICTURES_PER_ITEM} pictures. Remove one first`;

export const PICTURE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type PictureType = (typeof PICTURE_TYPES)[number];

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  bytes.length >= offset + signature.length && signature.every((byte, index) => bytes[offset + index] === byte);

const ascii = (text: string) => Array.from(Buffer.from(text, 'ascii'));

/** The picture's real type from its signature, or null when it is not a JPEG, PNG or WebP. */
export function pictureType(bytes: Uint8Array): PictureType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  // RIFF....WEBP
  if (startsWith(bytes, ascii('RIFF')) && startsWith(bytes, ascii('WEBP'), 8)) return 'image/webp';
  return null;
}

/** Why an upload cannot be an item picture, or null when it can. */
export function pictureProblem(bytes: Uint8Array): string | null {
  if (bytes.length === 0) return 'The picture is empty';
  if (bytes.length > MAX_PICTURE_BYTES) return PICTURE_TOO_LARGE;
  if (!pictureType(bytes)) return 'Upload a JPEG, PNG or WebP picture';
  return null;
}
