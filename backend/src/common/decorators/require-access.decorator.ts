import { SetMetadata } from '@nestjs/common';
import type { ModuleAction } from '../types/module-permissions.js';

export const REQUIRED_ACCESS_KEY = 'requiredAccess';
export const ADMIN_ONLY_KEY = 'adminOnly';
export const ALLOW_PENDING_PASSWORD_KEY = 'allowPendingPassword';

export interface RequiredAccess {
  module: string;
  action: ModuleAction;
}

// The route needs this action in this module (administrators always pass).
// Routes without it are open to every signed-in user.
export const RequireAccess = (module: string, action: ModuleAction) =>
  SetMetadata(REQUIRED_ACCESS_KEY, { module, action } satisfies RequiredAccess);

// Only administrators: managing users and roles.
export const AdminOnly = () => SetMetadata(ADMIN_ONLY_KEY, true);

// Reachable while the account still has to replace an admin-set password:
// signing out, one's own profile and the password change itself.
export const AllowPendingPassword = () =>
  SetMetadata(ALLOW_PENDING_PASSWORD_KEY, true);
