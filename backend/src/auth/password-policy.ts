// The single definition of what a valid new password is. The frontend mirrors
// these values in src/features/settings/password-schema.ts.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;
export const PASSWORD_RULE_MESSAGE = `Password needs at least ${PASSWORD_MIN_LENGTH} characters with a letter, a number and a symbol`;

export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MINUTES = 15;
