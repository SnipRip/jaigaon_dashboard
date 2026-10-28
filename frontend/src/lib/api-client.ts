import { SESSION_EXPIRED_PATH } from "@/config/auth";

// The one place browser code calls the backend from. Paths are relative to
// `/api`, which next.config.ts forwards to the NestJS server.
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Set on the login call, where a 401 means wrong credentials, not an expired session. */
  skipAuthRedirect?: boolean;
}

// NestJS sends `message` as a string, or a string[] for validation errors.
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json();
    const message = (data as { message?: unknown }).message;
    if (Array.isArray(message)) return message.join(". ");
    if (typeof message === "string") return message;
  } catch {
    // Not JSON: fall through to the generic message.
  }
  return "Something went wrong. Please try again.";
}

export async function apiRequest<T = void>(
  path: string,
  { method = "GET", body, skipAuthRedirect = false }: ApiRequestOptions = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: "same-origin",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && !skipAuthRedirect) {
    window.location.assign(SESSION_EXPIRED_PATH);
  }
  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response));
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** SWR fetcher for GET endpoints. */
export const apiGet = <T>(path: string) => apiRequest<T>(path);
