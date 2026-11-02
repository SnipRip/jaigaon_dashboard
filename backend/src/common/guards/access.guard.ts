import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ADMIN_ONLY_KEY,
  ALLOW_PENDING_PASSWORD_KEY,
  REQUIRED_ACCESS_KEY,
  type RequiredAccess,
} from '../decorators/require-access.decorator.js';
import type { AuthContext, AuthenticatedRequest } from '../types/authenticated-request.js';
import type { ModuleAction } from '../types/module-permissions.js';

/** Whether the user may do `action` in a module. Administrators may do everything. */
export const canAccess = (auth: AuthContext, module: string, action: ModuleAction) =>
  auth.role === 'ADMIN' || Boolean(auth.permissions[module]?.includes(action));

// Runs after SessionGuard. Public routes have no `auth` and pass through.
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const { auth } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!auth) return true;

    const targets = [context.getHandler(), context.getClass()];
    const read = <T>(key: string) => this.reflector.getAllAndOverride<T>(key, targets);

    if (auth.mustChangePassword && !read<boolean>(ALLOW_PENDING_PASSWORD_KEY)) {
      throw new ForbiddenException('Choose a new password before continuing');
    }
    if (auth.role === 'ADMIN') return true;
    if (read<boolean>(ADMIN_ONLY_KEY)) {
      throw new ForbiddenException('Only an administrator can do this');
    }

    const required = read<RequiredAccess>(REQUIRED_ACCESS_KEY);
    if (required && !canAccess(auth, required.module, required.action)) {
      throw new ForbiddenException('Your role does not allow this');
    }
    return true;
  }
}
