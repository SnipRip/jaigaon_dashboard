"use client";

import { useEffect } from "react";

// Tells the glass surface under the pointer where the pointer is, so the
// `glass` utility can draw a soft reflection there. One listener for the
// whole page, at most one update per frame, and nothing at all on touch
// screens. Surfaces opt in with `pointerLight` on GlassSurface.
export function PointerLight() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let frame = 0;
    const onPointerMove = (event: PointerEvent) => {
      const surface = (event.target as Element | null)?.closest<HTMLElement>("[data-glass-light]");
      if (!surface) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = surface.getBoundingClientRect();
        surface.style.setProperty("--glass-light-x", `${event.clientX - box.left}px`);
        surface.style.setProperty("--glass-light-y", `${event.clientY - box.top}px`);
      });
    };

    document.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
