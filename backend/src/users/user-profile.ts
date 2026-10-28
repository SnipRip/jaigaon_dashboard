import type { Role, User } from '../generated/prisma/client.js';

// The only shape of a user that ever leaves the API. Password hash and
// lockout fields are never included.
export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  displayName: string;
  phone: string | null;
  role: Role;
  passwordChangedAt: Date;
}

export function toUserProfile(user: User): UserProfile {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    displayName: user.displayName,
    phone: user.phone,
    role: user.role,
    passwordChangedAt: user.passwordChangedAt,
  };
}
