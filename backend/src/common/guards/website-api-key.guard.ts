import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import type { Env } from '../../config/env.js';

export const WEBSITE_API_KEY_HEADER = 'x-api-key';

const digest = (value: string) => createHash('sha256').update(value).digest();

// Protects routes the public website calls server-to-server.
@Injectable()
export class WebsiteApiKeyGuard implements CanActivate {
  private readonly expected: Buffer;

  constructor(config: ConfigService<Env, true>) {
    this.expected = digest(config.get('WEBSITE_API_KEY', { infer: true }));
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.get(WEBSITE_API_KEY_HEADER) ?? '';
    // Hashing first gives equal-length buffers for the constant-time compare.
    if (!timingSafeEqual(digest(provided), this.expected)) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
