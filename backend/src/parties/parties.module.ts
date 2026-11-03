import { Module } from '@nestjs/common';
import { PartiesController } from './parties.controller.js';
import { PartiesService } from './parties.service.js';

@Module({
  controllers: [PartiesController],
  providers: [PartiesService],
  // The importer (src/imports) saves rows through it.
  exports: [PartiesService],
})
export class PartiesModule {}
