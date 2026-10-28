import clsx from "clsx";
import type { ReactNode } from "react";
import { GlassSurface, type GlassSurfaceProps } from "./glass-surface";

/** The glass panel every block of content sits in. */
export function GlassCard({ className, ...props }: GlassSurfaceProps) {
  return <GlassSurface as="section" className={clsx("min-w-0 px-4 py-4 sm:px-[18px]", className)} {...props} />;
}

export function CardTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="text-sm leading-tight font-semibold">
      {children}
    </h2>
  );
}
