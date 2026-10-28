import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { LOGIN_PATH, HOME_PATH, SESSION_COOKIE_NAME } from "@/config/auth";

// A fast first check only: it looks at whether a session cookie is present.
// The cookie is verified against the backend in src/lib/server/current-user.ts
// and again by the API on every request.
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);
  const { pathname } = request.nextUrl;

  if (!hasSession && pathname !== LOGIN_PATH) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }
  if (hasSession && (pathname === LOGIN_PATH || pathname === "/")) {
    return NextResponse.redirect(new URL(HOME_PATH, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|images|favicon.ico).*)"],
};
