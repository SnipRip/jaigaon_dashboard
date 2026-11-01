import { BadRequestException, Injectable } from '@nestjs/common';
import { hashPassword } from '../auth/password-hashing.js';
import { SessionService } from '../auth/session.service.js';
import type { AuthContext } from '../common/types/authenticated-request.js';
import { PrismaService } from '../database/prisma.service.js';
import { Role } from '../generated/prisma/enums.js';
import type { CreateStaffDto } from './dto/create-staff.dto.js';
import type { UpdateStaffDto } from './dto/update-staff.dto.js';
import { toStaffMember, type StaffMember } from './staff-member.js';

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
  ) {}

  async list(): Promise<StaffMember[]> {
    const users = await this.prisma.user.findMany({
      orderBy: [{ isActive: 'desc' }, { displayName: 'asc' }],
    });
    return users.map((user) => toStaffMember(user));
  }

  async create(dto: CreateStaffDto): Promise<StaffMember> {
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        fullName: dto.fullName,
        displayName: dto.displayName,
        phone: dto.phone ?? null,
        role: dto.role,
        accessRoleId: dto.role === Role.ADMIN ? null : dto.accessRoleId,
        isActive: dto.isActive ?? true,
        passwordHash: await hashPassword(dto.temporaryPassword),
        mustChangePassword: true,
      },
    });
    return toStaffMember(user);
  }

  async update(
    auth: AuthContext,
    id: string,
    dto: UpdateStaffDto,
  ): Promise<StaffMember> {
    const current = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    const role = dto.role ?? current.role;
    const accessRoleId =
      role === Role.ADMIN
        ? null
        : dto.accessRoleId === undefined
          ? current.accessRoleId
          : dto.accessRoleId;

    // An administrator cannot lock themself out by demoting or disabling
    // their own account; another administrator has to do it.
    if (id === auth.userId && (role !== Role.ADMIN || dto.isActive === false)) {
      throw new BadRequestException(
        'You cannot remove your own administrator access or disable yourself',
      );
    }
    if (role === Role.STAFF && !accessRoleId) {
      throw new BadRequestException('Pick an access role');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email,
        fullName: dto.fullName,
        displayName: dto.displayName,
        phone: dto.phone,
        role,
        accessRoleId,
        isActive: dto.isActive,
      },
    });
    if (!user.isActive) await this.sessions.revokeAllForUser(id);
    return toStaffMember(user);
  }

  // Signs the person out everywhere and makes them choose a new password at
  // next sign-in. Also clears a lockout.
  async resetPassword(id: string, temporaryPassword: string): Promise<StaffMember> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: await hashPassword(temporaryPassword),
        passwordChangedAt: new Date(),
        mustChangePassword: true,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
    await this.sessions.revokeAllForUser(id);
    return toStaffMember(user);
  }
}
