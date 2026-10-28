import clsx from "clsx";
import type { CSSProperties, ElementType, HTMLAttributes } from "react";

export type GlassElevation = "resting" | "raised" | "floating";

export interface GlassSurfaceProps extends HTMLAttributes<HTMLElement> {
  /** The element to render. Defaults to a <div>. */
  as?: ElementType;
  /** How far the sheet floats above the page. Deeper shadow, same glass. */
  elevation?: GlassElevation;
  /** Lifts on hover. For a surface that is itself a link or a button. */
  interactive?: boolean;
  /** A soft reflection follows the pointer across the surface. */
  pointerLight?: boolean;
  /** Colour of the glass. Defaults to clear white. */
  tint?: string;
  /** How much of the tint is laid over the backdrop, 0 to 1. */
  opacity?: number;
  /** Backdrop blur in pixels. */
  blur?: number;
  /** Corner radius in pixels. */
  radius?: number;
}

// The sheet of glass every panel is cut from: cards, the sidebar, the top
// bar. The material itself is the `glass` utility in globals.css; the props
// here only override its variables for one surface.
export function GlassSurface({
  as: Element = "div",
  elevation = "resting",
  interactive,
  pointerLight,
  tint,
  opacity,
  blur,
  radius,
  className,
  style,
  ...props
}: GlassSurfaceProps) {
  const overrides = {
    "--glass-tint": tint,
    "--glass-fill": opacity,
    "--glass-blur": blur === undefined ? undefined : `${blur}px`,
    "--glass-radius": radius === undefined ? undefined : `${radius}px`,
  } as CSSProperties;

  return (
    <Element
      data-elevation={elevation === "resting" ? undefined : elevation}
      data-interactive={interactive ? "" : undefined}
      data-glass-light={pointerLight ? "" : undefined}
      className={clsx("glass", className)}
      style={{ ...overrides, ...style }}
      {...props}
    />
  );
}
