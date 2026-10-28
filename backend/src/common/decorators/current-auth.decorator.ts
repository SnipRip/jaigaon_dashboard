import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type {
  AuthContext,
  AuthenticatedRequest,
} from '../types/authenticated-request.js';

// Injects the signed-in user's id, role and session id into a handler.
export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthContext =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().auth,
);
