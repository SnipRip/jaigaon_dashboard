import { BadRequestException, Injectable } from '@nestjs/common';
import { hashPassword, verifyPassword } from '../auth/password-hashing.js';
import { SessionService } from '../auth/session.service.js';
import type { AuthContext } from '../common/types/authenticated-request.js';
import { PrismaService } from '../database/prisma.service.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import { toUserProfile, type UserProfile } from './user-profile.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
  ) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return toUserProfile(user);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserProfile> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName,
        displayName: dto.displayName,
        phone: dto.phone,
      },
    });
    return toUserProfile(user);
  }

  // Changing the password signs every other device out.
  async changePassword(auth: AuthContext, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: auth.userId },
    });
    if (!(await verifyPassword(user.passwordHash, dto.currentPassword))) {
      throw new BadRequestException('Current password is incorrect');
    }
    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException(
        'New password must be different from the current one',
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(dto.newPassword),
        passwordChangedAt: new Date(),
      },
    });
    await this.sessions.revokeOthers(auth);
  }
}
