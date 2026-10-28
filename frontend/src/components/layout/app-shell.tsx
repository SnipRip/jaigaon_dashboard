"use client";

import { useState, type ReactNode } from "react";
import { useLocalStorage } from "usehooks-ts";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { SearchEntry } from "@/features/search/search-match";
import { PageBackdrop } from "./page-backdrop";
import { PointerLight } from "./pointer-light";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

const SIDEBAR_COLLAPSED_KEY = "jqe.sidebar-collapsed";

// The frame around every signed-in page: sidebar, top bar and the page itself.
// The collapsed state is remembered per browser. Below the `lg` breakpoint the
// sidebar becomes a drawer opened from the top bar.
export function AppShell({ children, searchIndex }: { children: ReactNode; searchIndex: SearchEntry[] }) {
  const [collapsed, setCollapsed] = useLocalStorage(SIDEBAR_COLLAPSED_KEY, false, {
    initializeWithValue: false,
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  // The saved state arrives just after the first paint. Animating that would
  // make the sidebar fold itself on every page load, so it only starts to
  // animate once the user has pressed the button.
  const [sidebarAnimated, setSidebarAnimated] = useState(false);
  const toggleCollapsed = () => {
    setSidebarAnimated(true);
    setCollapsed(!collapsed);
  };
  const closeDrawer = () => setDrawerOpen(false);

  return (
    <TooltipProvider>
      <div className="relative min-h-screen">
        <PageBackdrop />
        <PointerLight />
        <div className="relative flex items-start gap-3 p-3 sm:gap-4 sm:p-4">
          <div className="sticky top-4 flex max-h-[calc(100vh-2rem)] shrink-0 max-lg:hidden">
            <Sidebar collapsed={collapsed} animated={sidebarAnimated} onToggleCollapsed={toggleCollapsed} />
          </div>

          {drawerOpen && (
            <div className="fixed inset-0 z-20 flex lg:hidden">
              <button type="button" aria-label="Close menu" onClick={closeDrawer} className="absolute inset-0 animate-fade-in bg-ink/35" />
              {/* Over page content rather than the wallpaper, so the sheet is denser. */}
              <div className="relative m-3 flex animate-drawer-in [--glass-blur:30px] [--glass-fill:0.78]">
                <Sidebar collapsed={false} onToggleCollapsed={closeDrawer} onNavigate={closeDrawer} />
              </div>
            </div>
          )}

          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-4">
            <Topbar onOpenMenu={() => setDrawerOpen(true)} searchIndex={searchIndex} />
            <main className="flex min-w-0 flex-col gap-3 sm:gap-4">{children}</main>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
