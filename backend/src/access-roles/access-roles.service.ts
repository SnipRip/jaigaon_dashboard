import { Injectable } from '@nestjs/common';
import {
  parsePermissions,
  readStoredPermissions,
  type ModulePermissions,
} from '../common/types/module-permissions.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AccessRole } from '../generated/prisma/client.js';
import type { CreateAccessRoleDto } from './dto/create-access-role.dto.js';
import type { UpdateAccessRoleDto } from './dto/update-access-role.dto.js';

export interface AccessRoleView {
  id: string;
  name: string;
  description: string;
  permissions: ModulePermissions;
  userCount: number;
}

const withCount = { _count: { select: { users: true } } } as const;

const toView = (role: AccessRole & { _count: { users: number } }): AccessRoleView => ({
  id: role.id,
  name: role.name,
  description: role.description,
  permissions: readStoredPermissions(role.permissions),
  userCount: role._count.users,
});

// A role in use cannot be deleted (foreign key → 409 from PrismaExceptionFilter).
@Injectable()
export class AccessRolesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<AccessRoleView[]> {
    const roles = await this.prisma.accessRole.findMany({
      orderBy: { name: 'asc' },
      include: withCount,
    });
    return roles.map(toView);
  }

  async create(dto: CreateAccessRoleDto): Promise<AccessRoleView> {
    const role = await this.prisma.accessRole.create({
      data: {
        name: dto.name,
        description: dto.description ?? '',
        permissions: parsePermissions(dto.permissions),
      },
      include: withCount,
    });
    return toView(role);
  }

  async update(id: string, dto: UpdateAccessRoleDto): Promise<AccessRoleView> {
    const role = await this.prisma.accessRole.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        permissions:
          dto.permissions === undefined ? undefined : parsePermissions(dto.permissions),
      },
      include: withCount,
    });
    return toView(role);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.accessRole.delete({ where: { id } });
  }
}
