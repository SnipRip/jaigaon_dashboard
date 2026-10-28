import { NextResponse, type NextRequest } from "next/server";
import { HOME_PATH, LOGIN_PATH, SESSION_COOKIE_NAME } from "@/config/auth";
import { verifySession } from "@/lib/server/verify-session";

// Where a signed-in page sends the browser when the backend rejects its
// session. The cookie is removed here so the proxy lets /login load; leaving
// it in place bounces the browser between /login and the dashboard forever.
// The session is checked again first, so a link to this address cannot sign
// out someone whose session is still good.
export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const status = token ? (await verifySession(token)).status : 401;

  if (status === 401) {
    const response = NextResponse.redirect(new URL(LOGIN_PATH, request.url));
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }
  if (status >= 200 && status < 300) {
    return NextResponse.redirect(new URL(HOME_PATH, request.url));
  }
  return new NextResponse("We could not check your session. Wait a minute, then reload this page.", { status: 503 });
}
