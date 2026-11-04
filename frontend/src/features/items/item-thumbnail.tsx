import clsx from "clsx";
import { ImageOff } from "lucide-react";
import Image from "next/image";

// An item's picture in a fixed square, or a quiet placeholder without one.
// `unoptimized`: the picture comes through /api with the session cookie,
// which Next's image optimiser would not send.
export function ItemThumbnail({ src, alt, size, className }: { src?: string; alt: string; size: number; className?: string }) {
  return (
    <span
      style={{ width: size, height: size }}
      className={clsx("glass-inset flex shrink-0 items-center justify-center overflow-hidden", className)}
    >
      {src ? (
        <Image src={src} alt={alt} width={size} height={size} unoptimized className="size-full object-cover" />
      ) : (
        <ImageOff aria-hidden="true" className="size-[45%] max-h-10 max-w-10 text-muted/60" />
      )}
    </span>
  );
}
