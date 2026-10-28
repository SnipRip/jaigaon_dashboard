import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentAuth } from '../common/decorators/current-auth.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import type { AuthContext } from '../common/types/authenticated-request.js';
import { clientMetaFrom } from '../common/types/client-meta.js';
import type { Env } from '../config/env.js';
import type { UserProfile } from '../users/user-profile.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { SESSION_COOKIE_NAME, sessionCookieOptions } from './session-cookie.js';
import { SessionService, type SessionSummary } from './session.service.js';

@Controller('auth')
export class AuthController {
  private readonly isProduction: boolean;

  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    config: ConfigService<Env, true>,
  ) {
    this.isProduction = config.get('NODE_ENV', { infer: true }) === 'production';
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserProfile> {
    const { token, profile } = await this.auth.login(
      dto.email,
      dto.password,
      clientMetaFrom(request),
    );
    response.cookie(
      SESSION_COOKIE_NAME,
      token,
      sessionCookieOptions(this.isProduction, this.sessions.ttlMs),
    );
    return profile;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentAuth() auth: AuthContext,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.sessions.revoke(auth.userId, auth.sessionId);
    response.clearCookie(
      SESSION_COOKIE_NAME,
      sessionCookieOptions(this.isProduction),
    );
  }

  @Get('sessions')
  listSessions(@CurrentAuth() auth: AuthContext): Promise<SessionSummary[]> {
    return this.sessions.listForUser(auth);
  }

  @Post('sessions/revoke-others')
  @HttpCode(HttpStatus.NO_CONTENT)
  revokeOtherSessions(@CurrentAuth() auth: AuthContext): Promise<void> {
    return this.sessions.revokeOthers(auth);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  revokeSession(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) sessionId: string,
  ): Promise<void> {
    return this.sessions.revoke(auth.userId, sessionId);
  }
}
