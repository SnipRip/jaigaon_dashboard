import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LOGIN_PATH, SESSION_COOKIE_NAME, SESSION_EXPIRED_PATH } from "@/config/auth";
import type { UserProfile } from "@/types/user";
import { verifySession } from "./verify-session";

// The server-side source of truth for "who is signed in". It asks the backend
// to verify the session cookie, so a forged or expired cookie never renders
// an authenticated page. `cache` keeps it to one backend call per request.
export const getCurrentUser = cache(async (): Promise<UserProfile> => {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) redirect(LOGIN_PATH);

  const response = await verifySession(token);
  // A layout cannot delete the dead cookie, and with it still set the proxy
  // would send /login straight back here. The route handler clears it first.
  if (response.status === 401) redirect(SESSION_EXPIRED_PATH);
  if (!response.ok) {
    throw new Error(`Could not load the signed-in user (${response.status})`);
  }
  return (await response.json()) as UserProfile;
});
