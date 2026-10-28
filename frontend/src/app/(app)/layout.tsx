import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageBackdrop } from "@/components/layout/page-backdrop";
import { CurrentUserProvider } from "@/features/auth/current-user-context";
import { buildSearchIndex } from "@/features/search/search-index";
import { getCurrentUser } from "@/lib/server/current-user";

// Every route in the (app) group renders inside this layout, so nothing in it
// is sent to the browser until the backend has verified the session.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PageBackdrop />}>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  );
}

async function AuthenticatedShell({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  return (
    <CurrentUserProvider user={user}>
      <AppShell searchIndex={buildSearchIndex()}>{children}</AppShell>
    </CurrentUserProvider>
  );
}
