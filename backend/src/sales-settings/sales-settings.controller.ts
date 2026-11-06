import { Body, Controller, Get, Patch } from '@nestjs/common';
import { AdminOnly } from '../common/decorators/require-access.decorator.js';
import { UpdateSalesSettingsDto } from './dto/update-sales-settings.dto.js';
import {
  SalesSettingsService,
  type SalesSettingsView,
} from './sales-settings.service.js';

// Reading is open to every signed-in user: the invoice form follows these.
// Changing them changes how everyone sells, so only administrators may.
@Controller('sales-settings')
export class SalesSettingsController {
  constructor(private readonly settings: SalesSettingsService) {}

  @Get()
  get(): Promise<SalesSettingsView> {
    return this.settings.get();
  }

  @AdminOnly()
  @Patch()
  update(@Body() dto: UpdateSalesSettingsDto): Promise<SalesSettingsView> {
    return this.settings.update(dto);
  }
}
