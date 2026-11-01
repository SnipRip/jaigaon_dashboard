import type { Request } from 'express';
import type { Role } from '../../generated/prisma/client.js';
import type { ModulePermissions } from './module-permissions.js';

// What the session guard attaches to a request once the cookie is verified.
// Read fresh on every request, so a role change applies at once.
export interface AuthContext {
  userId: string;
  role: Role;
  sessionId: string;
  /** The access role's permissions; empty for administrators, who need none. */
  permissions: ModulePermissions;
  mustChangePassword: boolean;
}

export interface AuthenticatedRequest extends Request {
  auth: AuthContext;
}
