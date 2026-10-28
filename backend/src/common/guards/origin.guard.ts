import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { Env } from '../../config/env.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// CSRF defence in depth: a browser always sends Origin on state-changing
// requests, so one from anywhere but the dashboard frontend is refused.
// Server-to-server callers send no Origin and are checked by their own guard.
@Injectable()
export class OriginGuard implements CanActivate {
  private readonly allowedOrigin: string;

  constructor(config: ConfigService<Env, true>) {
    this.allowedOrigin = config.get('FRONTEND_ORIGIN', { infer: true });
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method)) return true;

    const origin = request.get('origin');
    if (origin && origin !== this.allowedOrigin) {
      throw new ForbiddenException('Request origin not allowed');
    }
    return true;
  }
}
