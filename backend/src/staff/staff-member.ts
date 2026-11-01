import type { Role, User } from '../generated/prisma/client.js';

// A user as the Users page lists them. Like UserProfile, it never carries the
// password hash or lockout counters.
export interface StaffMember {
  id: string;
  email: string;
  fullName: string;
  displayName: string;
  phone: string | null;
  role: Role;
  accessRoleId: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  isLocked: boolean;
  lastSignInAt: Date | null;
  createdAt: Date;
}

export function toStaffMember(user: User, now = new Date()): StaffMember {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    displayName: user.displayName,
    phone: user.phone,
    role: user.role,
    accessRoleId: user.accessRoleId,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    isLocked: user.lockedUntil !== null && user.lockedUntil > now,
    lastSignInAt: user.lastSignInAt,
    createdAt: user.createdAt,
  };
}
