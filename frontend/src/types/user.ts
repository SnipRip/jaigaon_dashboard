// Shapes returned by the backend. Keep in step with
// backend/src/users/user-profile.ts and backend/src/auth/session.service.ts.
export type Role = "ADMIN" | "STAFF";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  displayName: string;
  phone: string | null;
  role: Role;
  passwordChangedAt: string;
  /** True until the person replaces a password an administrator set. */
  mustChangePassword: boolean;
}

export interface SessionSummary {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
}
