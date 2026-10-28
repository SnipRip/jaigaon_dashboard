"use client";

import clsx from "clsx";
import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Tooltip } from "@/components/ui/tooltip";
import { UserAvatar } from "@/components/ui/user-avatar";
import { NAV_GROUPS, findNavItem } from "@/config/navigation";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { signOut } from "@/features/auth/sign-out";
import { BrandLogo } from "./brand-logo";

const ICON_BUTTON =
  "glass-control glass-press flex size-11 shrink-0 items-center justify-center text-ink-soft hover:bg-white/80 hover:text-ink";

// Folding and unfolding: everything that moves or resizes shares this timing.
// The curve starts and lands gently. One that front-loads the movement (as
// the press animations do) covers most of the distance in the first few
// frames and reads as a snap. Only the properties that change are listed, so
// the browser has nothing else to track on each frame.
// The `!` lets it win over the transitions the glass utilities set themselves.
const SLIDE =
  "motion-safe:transition-[width,height,padding,left,right,bottom]! motion-safe:duration-[420ms]! motion-safe:ease-[cubic-bezier(0.45,0,0.15,1)]!";
// Text is gone early when folding and arrives late when unfolding, so it is
// never seen being clipped by the moving edge.
const FADE = "motion-safe:transition-opacity motion-safe:duration-200";
const FADE_IN_LATE = "motion-safe:delay-150";

interface SidebarProps {
  collapsed: boolean;
  /** Animate the change between collapsed and expanded. Off for the mobile drawer. */
  animated?: boolean;
  onToggleCollapsed: () => void;
  /** Called after a link is followed, so the mobile drawer can close. */
  onNavigate?: () => void;
}

// Main navigation. Expanded it shows the logo, group labels and item labels;
// collapsed it is a 72px icon rail that leaves more room for the page.
// It fills the height its parent gives it and scrolls the links inside.
//
// Both states render the same elements in the same places: only the width
// changes and the text fades. That is what lets the fold animate, so do not
// add markup that exists in one state only. The icons sit 36px from the left
// edge in both, which is the middle of the rail.
export function Sidebar({ collapsed, animated = false, onToggleCollapsed, onNavigate }: SidebarProps) {
  const activeHref = findNavItem(usePathname())?.href;
  const user = useCurrentUser();
  const slide = animated && SLIDE;
  const fade = clsx(animated && FADE, collapsed ? "opacity-0" : animated && FADE_IN_LATE);

  return (
    <GlassSurface
      as="nav"
      aria-label="Main"
      elevation="floating"
      className={clsx("flex flex-col px-3 py-3.5", slide, collapsed ? "w-[72px]" : "w-[264px]")}
    >
      <div className={clsx("flex shrink-0 items-center pb-3", slide, collapsed ? "pr-0.5 pl-0" : "pl-2")}>
        <div aria-hidden={collapsed} className={clsx("min-w-0 flex-1 overflow-hidden", fade)}>
          <div className="w-max">
            <BrandLogo height={52} priority />
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className={ICON_BUTTON}
        >
          {collapsed ? <PanelLeftOpen aria-hidden="true" className="size-5" /> : <PanelLeftClose aria-hidden="true" className="size-5" />}
        </button>
      </div>

      {/* Only the links scroll; the logo row above and the account row below stay put.
          The area runs into the right padding so its scrollbar sits clear of the links. */}
      <div className="-mr-3 -ml-3 flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto py-1 pl-3 [scrollbar-gutter:stable]">
        {NAV_GROUPS.map((group, index) => (
          <div key={group.label} className="mt-3 flex flex-col gap-1 first:mt-0">
            {/* The group name when expanded, a hairline in its place on the rail. */}
            <div className="relative flex h-6 items-center">
              <span className={clsx("truncate px-3.5 text-[11px] font-bold tracking-[0.08em] text-muted uppercase", fade)}>
                {group.label}
              </span>
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className={clsx("absolute inset-x-2 h-px bg-line", animated && FADE, !collapsed && "opacity-0")}
                />
              )}
            </div>
            {group.items.map(({ href, label, icon: Icon }) => {
              const isActive = href === activeHref;
              return (
                // Labels are hidden on the icon rail, so each link names itself on hover.
                <Tooltip key={href} label={label} side="right" disabled={!collapsed}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={isActive ? "page" : undefined}
                    aria-label={collapsed ? label : undefined}
                    className={clsx(
                      "glass-press flex h-11 shrink-0 items-center gap-3 rounded-full px-3.5 text-sm",
                      isActive ? "glass-selected font-bold" : "font-semibold text-ink-soft hover:bg-white/45 hover:text-ink",
                    )}
                  >
                    <Icon aria-hidden="true" strokeWidth={isActive ? 2.25 : 2} className="size-5 shrink-0" />
                    <span className={clsx("truncate", fade)}>{label}</span>
                  </Link>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </div>

      {/* Side by side when expanded, sign-out stacked above the avatar on the rail.
          Both are placed by hand so the move between the two can be animated. */}
      <div className="mt-2 shrink-0 border-t border-line pt-3">
        <div className={clsx("relative", slide, collapsed ? "h-24" : "h-11")}>
          <Link
            href="/settings"
            onClick={onNavigate}
            aria-label={collapsed ? `${user.displayName}, account settings` : undefined}
            className={clsx(
              "glass-inset glass-press absolute bottom-0 flex h-11 items-center gap-2.5 overflow-hidden rounded-full p-1 hover:bg-white/60",
              slide,
              collapsed ? "left-0.5 w-11" : "left-0 w-[calc(100%-52px)] pr-4",
            )}
          >
            <UserAvatar name={user.displayName} />
            <span className={clsx("flex min-w-0 flex-col", fade)}>
              <span className="truncate text-[13px] leading-tight font-bold">{user.displayName}</span>
              <span className="truncate text-xs leading-tight text-muted capitalize">{user.role.toLowerCase()}</span>
            </span>
          </Link>
          <Tooltip label="Sign out" side={collapsed ? "right" : "top"}>
            <button
              type="button"
              onClick={signOut}
              aria-label="Sign out"
              className={clsx(ICON_BUTTON, "absolute", slide, collapsed ? "right-0.5 bottom-[52px]" : "right-0 bottom-0")}
            >
              <LogOut aria-hidden="true" className="size-5" />
            </button>
          </Tooltip>
        </div>
      </div>
    </GlassSurface>
  );
}
