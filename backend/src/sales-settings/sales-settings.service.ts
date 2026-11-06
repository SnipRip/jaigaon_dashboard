import { Injectable } from '@nestjs/common';
import { definedFields } from '../common/dto/defined-fields.js';
import { PrismaService } from '../database/prisma.service.js';
import type { SalesSettings } from '../generated/prisma/client.js';
import type { UpdateSalesSettingsDto } from './dto/update-sales-settings.dto.js';

/** The settings as the API returns them; the row id is always 1. */
export type SalesSettingsView = Omit<SalesSettings, 'id'>;

const toView = ({ id: _id, ...settings }: SalesSettings): SalesSettingsView =>
  settings;

// The single sales settings row, created by its migration.
@Injectable()
export class SalesSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<SalesSettingsView> {
    return toView(
      await this.prisma.salesSettings.findUniqueOrThrow({ where: { id: 1 } }),
    );
  }

  async update(dto: UpdateSalesSettingsDto): Promise<SalesSettingsView> {
    return toView(
      await this.prisma.salesSettings.update({
        where: { id: 1 },
        data: definedFields(dto),
      }),
    );
  }
}
