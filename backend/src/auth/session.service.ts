import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import type { AuthContext } from '../common/types/authenticated-request.js';
import type { ClientMeta } from '../common/types/client-meta.js';
import type { Env } from '../config/env.js';
import { PrismaService } from '../database/prisma.service.js';

const HOUR_MS = 60 * 60 * 1000;
// lastSeenAt is refreshed at most this often, to avoid a write per request.
const LAST_SEEN_REFRESH_MS = 5 * 60 * 1000;

export interface SessionSummary {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  lastSeenAt: Date;
  isCurrent: boolean;
}

export const hashSessionToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

@Injectable()
export class SessionService {
  readonly ttlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    this.ttlMs = config.get('SESSION_TTL_HOURS', { infer: true }) * HOUR_MS;
  }

  // Returns the raw token for the cookie. Only its hash is stored.
  async create(userId: string, meta: ClientMeta): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: hashSessionToken(token),
        expiresAt: new Date(Date.now() + this.ttlMs),
        ...meta,
      },
    });
    return token;
  }

  async resolve(token: string): Promise<AuthContext | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: { select: { role: true, isActive: true } } },
    });
    if (!session || session.expiresAt <= new Date() || !session.user.isActive) {
      return null;
    }

    if (Date.now() - session.lastSeenAt.getTime() > LAST_SEEN_REFRESH_MS) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { lastSeenAt: new Date() },
      });
    }
    return {
      userId: session.userId,
      role: session.user.role,
      sessionId: session.id,
    };
  }

  async listForUser(auth: AuthContext): Promise<SessionSummary[]> {
    const sessions = await this.prisma.session.findMany({
      where: { userId: auth.userId, expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: 'desc' },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        lastSeenAt: true,
      },
    });
    return sessions.map((session) => ({
      ...session,
      isCurrent: session.id === auth.sessionId,
    }));
  }

  // Scoped by userId so one user can never revoke another user's session.
  async revoke(userId: string, sessionId: string): Promise<void> {
    const { count } = await this.prisma.session.deleteMany({
      where: { id: sessionId, userId },
    });
    if (count === 0) throw new NotFoundException('Session not found');
  }

  async revokeOthers(auth: AuthContext): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { userId: auth.userId, id: { not: auth.sessionId } },
    });
  }
}
