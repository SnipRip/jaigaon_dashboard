import "server-only";
import { SESSION_COOKIE_NAME } from "@/config/auth";

const apiUrl = process.env.API_URL ?? "http://localhost:4000";

/** Asks the backend who owns this session token. 401 means it is no longer valid. */
export function verifySession(token: string): Promise<Response> {
  return fetch(`${apiUrl}/api/users/me`, {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}` },
    cache: "no-store",
  });
}
