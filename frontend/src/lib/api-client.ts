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
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** JSON, or FormData for a file upload (the browser sets its content type). */
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
    headers: body === undefined || body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
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

/** What a failed save tells the user: the backend's reason, or a connection hint. */
export const saveErrorText = (error: unknown) =>
  error instanceof ApiError ? error.message : "Could not save. Check the connection and try again.";

/** Saves a file the backend sends (an Excel sheet) under the name it gives. */
export async function downloadFile(path: string, fallbackName: string): Promise<void> {
  const response = await fetch(`/api${path}`, { credentials: "same-origin" });
  if (response.status === 401) window.location.assign(SESSION_EXPIRED_PATH);
  if (!response.ok) throw new ApiError(response.status, await readErrorMessage(response));
  const name = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") ?? "")?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await response.blob());
  const link = Object.assign(document.createElement("a"), { href: url, download: name });
  link.click();
  URL.revokeObjectURL(url);
}

/** SWR fetcher for GET endpoints. */
export const apiGet = <T>(path: string) => apiRequest<T>(path);
