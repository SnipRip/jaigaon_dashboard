"use client";

import { createContext, use, type ReactNode } from "react";
import type { UserProfile } from "@/types/user";

const CurrentUserContext = createContext<UserProfile | null>(null);

// Makes the signed-in user, already verified on the server, available to
// client components without another request.
export function CurrentUserProvider({ user, children }: { user: UserProfile; children: ReactNode }) {
  return <CurrentUserContext value={user}>{children}</CurrentUserContext>;
}

export function useCurrentUser(): UserProfile {
  const user = use(CurrentUserContext);
  if (!user) throw new Error("useCurrentUser must be used inside CurrentUserProvider");
  return user;
}
