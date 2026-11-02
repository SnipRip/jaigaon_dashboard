import { Module } from '@nestjs/common';
import { HsnCodesController } from './hsn-codes.controller.js';
import { HsnCodesService } from './hsn-codes.service.js';

@Module({
  controllers: [HsnCodesController],
  providers: [HsnCodesService],
})
export class HsnCodesModule {}
