import { LOGIN_PATH } from "@/config/auth";
import { apiRequest } from "@/lib/api-client";

// Ends the session on the server, then does a full page load so no
// signed-in state survives in memory.
export async function signOut(): Promise<void> {
  try {
    await apiRequest("/auth/logout", { method: "POST", skipAuthRedirect: true });
  } finally {
    window.location.assign(LOGIN_PATH);
  }
}
