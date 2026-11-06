import { Injectable } from '@nestjs/common';
import { archivedFilter } from '../common/dto/archivable.js';
import { PrismaService } from '../database/prisma.service.js';
import { toTransporterView, transporterSelect, transporterWhere, type TransporterView } from './transporter-view.js';

@Injectable()
export class TransportersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(includeArchived?: boolean): Promise<TransporterView[]> {
    const rows = await this.prisma.party.findMany({
      where: { ...transporterWhere, ...archivedFilter(includeArchived) },
      orderBy: { displayName: 'asc' },
      select: transporterSelect,
    });
    return rows.map(toTransporterView);
  }
}
