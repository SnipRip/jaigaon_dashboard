import type { CookieOptions } from 'express';

export const SESSION_COOKIE_NAME = 'jqe_session';

// httpOnly keeps the token away from scripts, SameSite=Strict keeps it off
// cross-site requests, and Secure is on wherever the app is served over HTTPS.
export function sessionCookieOptions(
  isProduction: boolean,
  maxAgeMs?: number,
): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: isProduction,
    path: '/',
    ...(maxAgeMs === undefined ? {} : { maxAge: maxAgeMs }),
  };
}
