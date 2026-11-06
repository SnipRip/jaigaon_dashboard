import { Module } from '@nestjs/common';
import { SalesSettingsController } from './sales-settings.controller.js';
import { SalesSettingsService } from './sales-settings.service.js';

@Module({
  controllers: [SalesSettingsController],
  providers: [SalesSettingsService],
})
export class SalesSettingsModule {}
