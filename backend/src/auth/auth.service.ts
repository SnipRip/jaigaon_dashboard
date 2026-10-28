import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { ClientMeta } from '../common/types/client-meta.js';
import { PrismaService } from '../database/prisma.service.js';
import { toUserProfile, type UserProfile } from '../users/user-profile.js';
import { hashPassword, verifyPassword } from './password-hashing.js';
import { LOCKOUT_MINUTES, MAX_FAILED_LOGINS } from './password-policy.js';
import { SessionService } from './session.service.js';

const INVALID_CREDENTIALS = 'Email or password is incorrect';

export interface LoginResult {
  token: string;
  profile: UserProfile;
}

@Injectable()
export class AuthService {
  // Verified against when the email is unknown, so a wrong email and a wrong
  // password take the same time to reject.
  private readonly decoyHash = hashPassword('decoy-password-never-matches');

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
  ) {}

  async login(
    email: string,
    password: string,
    meta: ClientMeta,
  ): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      await verifyPassword(await this.decoyHash, password);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new HttpException(
        `Too many failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!(await verifyPassword(user.passwordHash, password))) {
      await this.recordFailedLogin(user.id, user.failedLoginCount);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
    return {
      token: await this.sessions.create(user.id, meta),
      profile: toUserProfile(user),
    };
  }

  private async recordFailedLogin(
    userId: string,
    previousFailures: number,
  ): Promise<void> {
    const failures = previousFailures + 1;
    const isLocked = failures >= MAX_FAILED_LOGINS;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginCount: isLocked ? 0 : failures,
        lockedUntil: isLocked
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
          : null,
      },
    });
  }
}
