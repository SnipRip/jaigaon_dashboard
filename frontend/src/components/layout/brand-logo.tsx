import Image from "next/image";

// Intrinsic size of public/images/jqe-logo.png.
const LOGO_WIDTH = 359;
const LOGO_HEIGHT = 201;

export function BrandLogo({ height, priority = false }: { height: number; priority?: boolean }) {
  return (
    <Image
      src="/images/jqe-logo.png"
      alt="Jaigaon Quality Enterprise"
      width={Math.round((height * LOGO_WIDTH) / LOGO_HEIGHT)}
      height={height}
      priority={priority}
    />
  );
}
