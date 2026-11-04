import { MAX_PICTURE_BYTES, PICTURE_TOO_LARGE, pictureProblem, pictureType } from './item-picture-rules.js';

const jpeg = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10];
const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00];
const webp = [...Buffer.from('RIFF'), 0x24, 0x00, 0x00, 0x00, ...Buffer.from('WEBPVP8 ')];

/** A file of `size` bytes that starts with `head`. */
const file = (head: number[], size = head.length) => {
  const bytes = new Uint8Array(size);
  bytes.set(head);
  return bytes;
};

describe('pictureType', () => {
  it('reads JPEG, PNG and WebP from their signatures', () => {
    expect(pictureType(file(jpeg))).toBe('image/jpeg');
    expect(pictureType(file(png))).toBe('image/png');
    expect(pictureType(file(webp))).toBe('image/webp');
  });

  it('refuses other files, whatever they are called', () => {
    expect(pictureType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(pictureType(Buffer.from('GIF89a'))).toBeNull();
    expect(pictureType(Buffer.from('%PDF-1.7'))).toBeNull();
    expect(pictureType(file([0x4d, 0x5a, 0x90, 0x00]))).toBeNull(); // .exe
    // A RIFF that is not WebP (a WAV sound).
    expect(pictureType(Buffer.from('RIFF\x24\x00\x00\x00WAVEfmt '))).toBeNull();
  });

  it('refuses a cut-off signature', () => {
    expect(pictureType(file([0xff, 0xd8]))).toBeNull();
    expect(pictureType(file(png.slice(0, 4)))).toBeNull();
    expect(pictureType(Buffer.from('RIFF'))).toBeNull();
  });
});

describe('pictureProblem', () => {
  it('accepts a picture of exactly 1 MB', () => {
    expect(pictureProblem(file(png, MAX_PICTURE_BYTES))).toBeNull();
    expect(pictureProblem(file(jpeg, 20_000))).toBeNull();
  });

  it('refuses a picture over 1 MB', () => {
    expect(pictureProblem(file(png, MAX_PICTURE_BYTES + 1))).toBe(PICTURE_TOO_LARGE);
  });

  it('refuses an empty file and one that is not a picture', () => {
    expect(pictureProblem(new Uint8Array(0))).toBe('The picture is empty');
    expect(pictureProblem(Buffer.from('not a picture'))).toBe('Upload a JPEG, PNG or WebP picture');
  });
});
