// Must match SESSION_COOKIE_NAME in backend/src/auth/session-cookie.ts.
export const SESSION_COOKIE_NAME = "jqe_session";

export const LOGIN_PATH = "/login";
export const HOME_PATH = "/dashboard";
/** Where an account with an admin-set password is sent to choose its own. */
export const SETTINGS_PATH = "/settings";
/** Clears a session cookie the backend no longer accepts, then goes to the login page. */
export const SESSION_EXPIRED_PATH = "/session-expired";
