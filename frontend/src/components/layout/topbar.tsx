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
    <GlassSurface as="header" className="flex min-h-[72px] items-center gap-3 py-3 pr-3.5 pl-3.5 sm:gap-3.5 lg:pl-6">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu"
        className="glass-control glass-press flex size-11 shrink-0 items-center justify-center hover:bg-white/80 lg:hidden"
      >
        <Menu aria-hidden="true" className="size-5" />
      </button>

      <div className="mr-auto flex min-w-0 flex-col">
        <h1 className="truncate text-[22px] leading-tight font-bold tracking-tight">{page?.label ?? "Jaigaon Quality Enterprise"}</h1>
        {page && <span className="truncate text-[13px] font-medium text-muted">{page.summary}</span>}
      </div>

      <GlobalSearch index={searchIndex} />

      <Link href="/quotations/new" className={buttonClasses("primary", "shrink-0 max-sm:w-11 max-sm:px-0")}>
        <Plus aria-hidden="true" className="size-[18px]" />
        <span className="max-sm:sr-only">New quotation</span>
      </Link>
      <Link href="/settings" aria-label="Account settings" className="glass-press shrink-0 rounded-full">
        <UserAvatar name={user.displayName} className="size-11 text-sm" />
      </Link>
    </GlassSurface>
  );
}
