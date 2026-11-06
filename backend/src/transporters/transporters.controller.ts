import { Controller, Get, Query } from '@nestjs/common';
import { RequireAccess } from '../common/decorators/require-access.decorator.js';
import { ListQueryDto } from '../common/dto/field-validators.js';
import type { TransporterView } from './transporter-view.js';
import { TransportersService } from './transporters.service.js';

export const TRANSPORTERS_MODULE = '/masters/transporters';

// Read only: a transporter is edited on its vendor record, its trucks on the vehicle master.
@Controller('transporters')
export class TransportersController {
  constructor(private readonly transporters: TransportersService) {}

  @RequireAccess(TRANSPORTERS_MODULE, 'view')
  @Get()
  list(@Query() query: ListQueryDto): Promise<TransporterView[]> {
    return this.transporters.list(query.includeArchived);
  }
}
