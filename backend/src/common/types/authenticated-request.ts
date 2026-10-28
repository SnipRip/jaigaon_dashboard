import type { Request } from 'express';
import type { Role } from '../../generated/prisma/client.js';

// What the session guard attaches to a request once the cookie is verified.
export interface AuthContext {
  userId: string;
  role: Role;
  sessionId: string;
}

export interface AuthenticatedRequest extends Request {
  auth: AuthContext;
}
