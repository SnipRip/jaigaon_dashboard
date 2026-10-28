"use client";

import { Menu, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { GlassSurface } from "@/components/ui/glass-surface";
import { UserAvatar } from "@/components/ui/user-avatar";
import { findNavItem } from "@/config/navigation";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { GlobalSearch } from "@/features/search/global-search";
import type { SearchEntry } from "@/features/search/search-match";

// Page title (taken from the navigation config), global search and the
// shortcuts that are useful on every screen.
export function Topbar({ onOpenMenu, searchIndex }: { onOpenMenu: () => void; searchIndex: SearchEntry[] }) {
  const page = findNavItem(usePathname());
  const user = useCurrentUser();

  return (
    <GlassSurface as="header" className="flex min-h-14 items-center gap-2.5 py-2.5 pr-3 pl-3 lg:pl-[18px]">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu"
        className="glass-control glass-press flex size-8 shrink-0 items-center justify-center hover:bg-neutral-tint/60 lg:hidden"
      >
        <Menu aria-hidden="true" className="size-4" />
      </button>

      <div className="mr-auto flex min-w-0 flex-col">
        <h1 className="truncate text-[17px] leading-tight font-semibold tracking-[-0.01em]">{page?.label ?? "Jaigaon Quality Enterprise"}</h1>
        {page && <span className="truncate text-xs text-muted">{page.summary}</span>}
      </div>

      <GlobalSearch index={searchIndex} />

      <Link href="/quotations/new" className={buttonClasses("primary", "shrink-0 max-sm:w-8 max-sm:px-0")}>
        <Plus aria-hidden="true" />
        <span className="max-sm:sr-only">New quotation</span>
      </Link>
      <Link href="/settings" aria-label="Account settings" className="shrink-0 rounded-full">
        <UserAvatar name={user.displayName} />
      </Link>
    </GlassSurface>
  );
}
