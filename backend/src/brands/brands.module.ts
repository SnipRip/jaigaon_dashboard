import { Module } from '@nestjs/common';
import { BrandsController } from './brands.controller.js';
import { BrandsService } from './brands.service.js';

@Module({
  controllers: [BrandsController],
  providers: [BrandsService],
  // The importer (src/imports) saves rows through it.
  exports: [BrandsService],
})
export class BrandsModule {}
