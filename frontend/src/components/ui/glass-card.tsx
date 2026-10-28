import clsx from "clsx";
import type { ReactNode } from "react";
import { GlassSurface, type GlassSurfaceProps } from "./glass-surface";

/** The glass panel every block of content sits in. */
export function GlassCard({ className, ...props }: GlassSurfaceProps) {
  return <GlassSurface as="section" className={clsx("min-w-0 p-5 sm:p-6", className)} {...props} />;
}

export function CardTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="text-[17px] leading-tight font-bold tracking-tight">
      {children}
    </h2>
  );
}
