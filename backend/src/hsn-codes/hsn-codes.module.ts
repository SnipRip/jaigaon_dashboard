import { Module } from '@nestjs/common';
import { HsnCodesController } from './hsn-codes.controller.js';
import { HsnCodesService } from './hsn-codes.service.js';

@Module({
  controllers: [HsnCodesController],
  providers: [HsnCodesService],
  // The importer (src/imports) saves rows through it.
  exports: [HsnCodesService],
})
export class HsnCodesModule {}
