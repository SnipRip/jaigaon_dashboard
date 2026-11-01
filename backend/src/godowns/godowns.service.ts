import { BadRequestException, Injectable } from '@nestjs/common';
import { archivedFilter } from '../common/dto/archivable.js';
import { PrismaService } from '../database/prisma.service.js';
import type { Godown } from '../generated/prisma/client.js';
import type { CreateGodownDto } from './dto/create-godown.dto.js';
import type { UpdateGodownDto } from './dto/update-godown.dto.js';

// At most one godown is the default (where opening stock and new stock go
// unless another is picked). Making one the default clears the others in
// the same transaction.
@Injectable()
export class GodownsService {
  constructor(private readonly prisma: PrismaService) {}

  list(includeArchived?: boolean): Promise<Godown[]> {
    return this.prisma.godown.findMany({
      where: archivedFilter(includeArchived),
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  create(dto: CreateGodownDto): Promise<Godown> {
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) await tx.godown.updateMany({ data: { isDefault: false } });
      return tx.godown.create({ data: dto });
    });
  }

  update(id: string, dto: UpdateGodownDto): Promise<Godown> {
    if (dto.isDefault && dto.isArchived) {
      throw new BadRequestException('An archived godown cannot be the default');
    }
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.godown.updateMany({ where: { id: { not: id } }, data: { isDefault: false } });
      }
      // Archiving the default leaves no default until another is chosen.
      if (dto.isArchived) dto.isDefault = false;
      return tx.godown.update({ where: { id }, data: dto });
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.godown.delete({ where: { id } });
  }
}
